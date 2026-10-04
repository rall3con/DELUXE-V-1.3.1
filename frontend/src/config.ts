// ============================================================================
//  CONFIGURAZIONE SERVER BACKEND
// ----------------------------------------------------------------------------
//  Questo è l'UNICO punto in cui l'app sceglie dove inviare le chiamate API.
//
//  Come cambiare il server:
//  1. Modifica temporanea dall'app (consigliata se vuoi provare velocemente):
//     Impostazioni → Server → inserisci il nuovo URL.
//     L'override viene salvato in AsyncStorage e sopravvive ai riavvii dell'app.
//
//  2. Modifica permanente (hardcoded, utile per self-hosting):
//     Sostituisci il valore di DEFAULT_BACKEND_URL qui sotto con il tuo URL.
//     Ricorda:
//        - Il server DEVE esporre le API sotto il prefisso /api.
//        - Niente slash finale.
//        - Deve rispondere con CORS aperto (o almeno all'origine dell'app).
//
//  Esempi di URL validi:
//     https://wallet-tracker-278.preview.emergentagent.com   (default Emergent)
//     https://api.miodominio.it
//     http://192.168.1.42:8001                               (self-host locale)
// ============================================================================

import AsyncStorage from "@react-native-async-storage/async-storage";

/** URL predefinito di Emergent (letto dalle variabili d'ambiente Expo). */
const DEFAULT_BACKEND_URL: string =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  "https://wallet-tracker-278.preview.emergentagent.com";

const OVERRIDE_KEY = "gestore_conto_backend_url_override";

let overrideUrl: string | null = null;
let initialized = false;

/** Carica l'eventuale override salvato in AsyncStorage. */
export async function initBackendUrl(): Promise<void> {
  if (initialized) return;
  try {
    const v = await AsyncStorage.getItem(OVERRIDE_KEY);
    overrideUrl = v;
  } catch {
    overrideUrl = null;
  }
  initialized = true;
}

/** Ritorna l'URL attualmente in uso. Dopo initBackendUrl() restituisce l'override se presente. */
export function getBackendUrl(): string {
  const url = (overrideUrl ?? DEFAULT_BACKEND_URL).trim();
  return url.replace(/\/+$/, ""); // no slash finale
}

/** Ritorna l'URL predefinito (quello di Emergent / env). */
export function getDefaultBackendUrl(): string {
  return DEFAULT_BACKEND_URL.replace(/\/+$/, "");
}

/** Ritorna solo l'override, se impostato. */
export function getOverrideBackendUrl(): string | null {
  return overrideUrl;
}

/**
 * Imposta un override. Passa null per tornare al default.
 * Normalizza l'URL rimuovendo spazi e slash finali.
 */
export async function setBackendUrlOverride(url: string | null): Promise<void> {
  if (url && url.trim()) {
    const clean = url.trim().replace(/\/+$/, "");
    await AsyncStorage.setItem(OVERRIDE_KEY, clean);
    overrideUrl = clean;
  } else {
    await AsyncStorage.removeItem(OVERRIDE_KEY);
    overrideUrl = null;
  }
}

/**
 * Costruisce un URL completo per un endpoint API.
 *  apiUrl("/receipts/scan")  →  "<backend>/api/receipts/scan"
 */
export function apiUrl(path: string): string {
  const base = getBackendUrl();
  const p = path.startsWith("/") ? path : "/" + path;
  // tutte le API devono passare per /api
  if (p.startsWith("/api/")) return base + p;
  return base + "/api" + p;
}
