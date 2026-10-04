// Gemini client — talks directly to the Google Generative Language REST API.
// The user's API key is stored on-device in SecureStore (or AsyncStorage on web).
// No key ever reaches our backend.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY_STORAGE = "gestore_conto_gemini_key";
const MODEL_STORAGE = "gestore_conto_gemini_model";

// Default model (user picked "Gemini 3 Flash"). Can be overridden from the UI.
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

export const GEMINI_MODELS = [
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (consigliato)" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

async function secureGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function secureSet(key: string, val: string): Promise<void> {
  try {
    if (Platform.OS === "web") await AsyncStorage.setItem(key, val);
    else await SecureStore.setItemAsync(key, val);
  } catch {}
}
async function secureDelete(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {}
}

export async function getGeminiKey(): Promise<string | null> {
  return secureGet(KEY_STORAGE);
}

export async function setGeminiKey(key: string | null): Promise<void> {
  if (key && key.trim()) await secureSet(KEY_STORAGE, key.trim());
  else await secureDelete(KEY_STORAGE);
}

export async function getGeminiModel(): Promise<string> {
  const v = await AsyncStorage.getItem(MODEL_STORAGE);
  return v || DEFAULT_GEMINI_MODEL;
}

export async function setGeminiModel(id: string): Promise<void> {
  await AsyncStorage.setItem(MODEL_STORAGE, id);
}

// --- Receipt extraction ---

export type RawReceiptItem = {
  name: string;
  price: number | null;
  qty?: number | null;
};

export type ReceiptResult = {
  store: string | null;
  date: string | null;
  items: RawReceiptItem[];
  total: number | null;
  rawText?: string;
};

const RECEIPT_PROMPT = `Sei un lettore di scontrini di supermercato italiani.
Analizza l'immagine fornita e restituisci SOLO un oggetto JSON (nessun testo intorno) con questa struttura:
{
  "store": "<nome del supermercato o negozio esattamente come riportato in cima allo scontrino, es. 'Esselunga', 'Conad', 'Lidl'. Se non visibile usa null>",
  "date": "<data dello scontrino in formato AAAA-MM-GG, o null>",
  "items": [
    { "name": "<descrizione del prodotto in italiano come riportato>", "price": <numero decimale in euro con punto, es. 2.49>, "qty": <numero di pezzi o null> }
  ],
  "total": <totale finale in euro con punto, es. 23.80>
}
Regole:
- Un elemento per ogni riga di prodotto. NON includere sconti, saldi, totali intermedi, pagamenti, resto, bancomat.
- Normalizza i prezzi: usa il punto come separatore decimale. Nessun simbolo di valuta.
- Se un prezzo o una descrizione non è leggibile per quella riga, lascia price = null e name con la parte leggibile.
- Se vedi uno sconto applicato a una riga, applica lo sconto al prezzo di quella riga.
- Rispondi SOLO con il JSON. Niente commenti, niente markdown, niente \`\`\`.`;

/**
 * Calls Gemini with the receipt image and returns a parsed ReceiptResult.
 * Throws on auth / network errors.
 */
export async function scanReceipt(
  base64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
): Promise<ReceiptResult> {
  const key = await getGeminiKey();
  if (!key) throw new Error("NO_KEY");
  const model = await getGeminiModel();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: RECEIPT_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new Error("NETWORK: " + (e?.message ?? "fetch failed"));
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 400 && /API key not valid/i.test(txt))
      throw new Error("INVALID_KEY");
    if (res.status === 401 || res.status === 403)
      throw new Error("INVALID_KEY");
    if (res.status === 404) throw new Error("INVALID_MODEL");
    throw new Error(`HTTP_${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text ?? "")
      .join("") ?? data?.candidates?.[0]?.content?.text;

  if (!text) throw new Error("EMPTY_RESPONSE");

  // Gemini may still wrap in ```json fences in rare cases — strip them.
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("PARSE_ERROR");
  }

  const items: RawReceiptItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((it: any) => ({
        name: String(it.name ?? "").trim(),
        price:
          typeof it.price === "number" && isFinite(it.price)
            ? it.price
            : null,
        qty:
          typeof it.qty === "number" && isFinite(it.qty) ? it.qty : null,
      }))
    : [];

  return {
    store: parsed.store ? String(parsed.store).trim() : null,
    date: parsed.date ? String(parsed.date).trim() : null,
    items,
    total:
      typeof parsed.total === "number" && isFinite(parsed.total)
        ? parsed.total
        : null,
    rawText: text,
  };
}
