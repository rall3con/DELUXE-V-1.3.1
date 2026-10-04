import FeatherIcon from "@react-native-vector-icons/feather";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCurrency } from "@/src/currency";
import { getGeminiKey, scanReceipt, ReceiptResult } from "@/src/gemini";
import {
  addTransaction,
  getActiveCategories,
  useAppState,
} from "@/src/store";
import { colors, radius, spacing } from "@/src/theme";
import { ReceiptItem } from "@/src/types";

type Phase =
  | "pick" // choose camera or gallery
  | "analyzing" // uploading / waiting Gemini
  | "review" // user reviews and edits
  | "no-key"; // missing API key

type EditableItem = {
  id: string;
  name: string;
  priceStr: string;
  qty?: number;
};

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function ReceiptScan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const state = useAppState();
  const { info, rates, currency, format } = useCurrency();

  const [phase, setPhase] = useState<Phase>("pick");
  const [image, setImage] = useState<string | null>(null);
  const [raw, setRaw] = useState<ReceiptResult | null>(null);
  const [store, setStore] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [sectionId, setSectionId] = useState<string>("main");
  const [categoryId, setCategoryId] = useState<string>("food");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const expenseCats = useMemo(
    () => (state ? getActiveCategories(state, "expense") : []),
    [state],
  );
  const sections = state?.sections ?? [];

  useEffect(() => {
    (async () => {
      const k = await getGeminiKey();
      if (!k) setPhase("no-key");
    })();
  }, []);

  useEffect(() => {
    if (sections.length && !sections.find((s) => s.id === sectionId)) {
      setSectionId(sections[0].id);
    }
  }, [sections]);

  const total = useMemo(
    () =>
      items.reduce((sum, it) => {
        const n = parseFloat(it.priceStr.replace(",", "."));
        return isFinite(n) ? sum + n * (it.qty ?? 1) : sum;
      }, 0),
    [items],
  );

  const invalidCount = items.filter((it) => {
    const n = parseFloat(it.priceStr.replace(",", "."));
    return !isFinite(n) || n <= 0 || !it.name.trim();
  }).length;

  const canSave =
    phase === "review" &&
    items.length > 0 &&
    invalidCount === 0 &&
    !!store.trim() &&
    total > 0;

  const pickFrom = async (source: "camera" | "library") => {
    setError(null);
    try {
      let perm;
      if (source === "camera") {
        perm = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          Alert.alert(
            "Permesso richiesto",
            "Attiva il permesso dalle impostazioni del telefono.",
            [
              { text: "Annulla", style: "cancel" },
              { text: "Apri Impostazioni", onPress: () => Linking.openSettings() },
            ],
          );
        }
        return;
      }

      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.75,
        base64: true,
      };
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      const uri = asset.uri;
      const base64 = asset.base64;
      if (!base64) {
        setError("Impossibile leggere l'immagine");
        return;
      }
      setImage(uri);
      setPhase("analyzing");

      try {
        const scanned = await scanReceipt(base64, "image/jpeg");
        setRaw(scanned);
        setStore(scanned.store ?? "");
        setItems(
          scanned.items.map((it) => ({
            id: newId(),
            name: it.name,
            priceStr:
              it.price != null
                ? info.decimals === 0
                  ? Math.round(it.price).toString()
                  : it.price.toFixed(2).replace(".", ",")
                : "",
            qty: it.qty ?? undefined,
          })),
        );
        // Guess "Bollette"? No, use food for receipts
        setCategoryId(
          expenseCats.find((c) => c.id === "food")?.id ??
            expenseCats[0]?.id ??
            "other-out",
        );
        setPhase("review");
      } catch (e: any) {
        setPhase("pick");
        const msg = String(e?.message ?? "");
        if (msg === "NO_KEY") setPhase("no-key");
        else if (msg === "INVALID_KEY")
          setError("Chiave Gemini non valida. Controlla in Impostazioni → Scanner.");
        else if (msg === "INVALID_MODEL")
          setError("Il modello selezionato non è disponibile. Scegline un altro.");
        else if (msg.startsWith("NETWORK"))
          setError("Problema di rete. Riprova.");
        else if (msg === "EMPTY_RESPONSE" || msg === "PARSE_ERROR")
          setError("Non sono riuscito a leggere lo scontrino. Riprova con una foto più nitida.");
        else setError("Errore: " + msg.slice(0, 120));
      }
    } catch (e: any) {
      setError(String(e?.message ?? "errore"));
    }
  };

  const updateItem = (id: string, patch: Partial<EditableItem>) => {
    setItems((old) => old.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((old) => old.filter((it) => it.id !== id));
  };

  const addItem = () => {
    setItems((old) => [
      ...old,
      { id: newId(), name: "", priceStr: "", qty: undefined },
    ]);
  };

  const requestSave = () => {
    if (!canSave) return;
    setConfirmOpen(true);
  };

  const doSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Build receipt items in EUR (convert from displayed currency)
      const rate = currency === "EUR" ? 1 : rates?.rates[currency] ?? 1;
      const receiptItems: ReceiptItem[] = items.map((it) => {
        const n = parseFloat(it.priceStr.replace(",", "."));
        return {
          name: it.name.trim(),
          price: n / rate,
          qty: it.qty,
        };
      });
      const totalEUR = total / rate;

      await addTransaction({
        type: "expense",
        amount: totalEUR,
        category: categoryId,
        note: store.trim(),
        sectionId,
        receipt: {
          store: store.trim(),
          items: receiptItems,
          scannedAt: new Date().toISOString(),
          imageUri: image ?? undefined,
        },
      });
      setConfirmOpen(false);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  // ---- RENDER ----

  if (phase === "no-key") {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => router.back()} title="Scansiona scontrino" />
        <View style={styles.centered}>
          <View style={styles.hero}>
            <FeatherIcon name="key" size={32} color={colors.brandPrimary} />
          </View>
          <Text style={styles.heroTitle}>Configura la tua chiave Gemini</Text>
          <Text style={styles.heroSub}>
            Serve una chiave API Google per leggere gli scontrini. È gratuita,
            la configuri una volta e resta solo sul tuo dispositivo.
          </Text>
          <Pressable
            testID="scan-go-ai"
            onPress={() => router.replace("/settings/ai")}
            style={[styles.primaryBtn, { marginTop: spacing.lg }]}
          >
            <Text style={styles.primaryBtnText}>Apri impostazioni AI</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "analyzing") {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => setPhase("pick")} title="Analisi in corso" />
        <View style={styles.centered}>
          {image && (
            <Image
              source={{ uri: image }}
              style={styles.preview}
              contentFit="contain"
            />
          )}
          <ActivityIndicator color={colors.brandPrimary} size="large" />
          <Text style={styles.heroTitle}>Sto leggendo lo scontrino…</Text>
          <Text style={styles.heroSub}>Il tempo medio è 3-6 secondi.</Text>
        </View>
      </View>
    );
  }

  if (phase === "pick") {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => router.back()} title="Scansiona scontrino" />
        <View style={[styles.centered, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.hero}>
            <FeatherIcon name="camera" size={32} color={colors.brandPrimary} />
          </View>
          <Text style={styles.heroTitle}>Fotografa o carica uno scontrino</Text>
          <Text style={styles.heroSub}>
            Gemini leggerà il supermercato e tutte le voci. Puoi correggere a mano
            prima di salvare.
          </Text>

          {error && (
            <Text style={styles.error} testID="scan-error">
              {error}
            </Text>
          )}

          <View style={styles.pickRow}>
            <Pressable
              testID="scan-camera"
              onPress={() => pickFrom("camera")}
              style={styles.pickBtn}
            >
              <FeatherIcon
                name="camera"
                size={22}
                color={colors.brandPrimary}
              />
              <Text style={styles.pickLabel}>Fotocamera</Text>
            </Pressable>
            <Pressable
              testID="scan-library"
              onPress={() => pickFrom("library")}
              style={styles.pickBtn}
            >
              <FeatherIcon
                name="image"
                size={22}
                color={colors.brandPrimary}
              />
              <Text style={styles.pickLabel}>Galleria</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // phase === "review"
  return (
    <View style={styles.container} testID="scan-review">
      <TopBar onBack={() => setPhase("pick")} title="Rivedi scontrino" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 220 }}
        keyboardShouldPersistTaps="handled"
      >
        {image && (
          <Image
            source={{ uri: image }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        <Text style={styles.label}>Supermercato / Negozio</Text>
        <TextInput
          testID="scan-store"
          value={store}
          onChangeText={setStore}
          placeholder="es. Esselunga"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Prodotti</Text>
        {items.map((it, i) => {
          const n = parseFloat(it.priceStr.replace(",", "."));
          const invalid = !isFinite(n) || n <= 0 || !it.name.trim();
          return (
            <View
              key={it.id}
              style={[styles.item, invalid && styles.itemInvalid]}
              testID={`scan-item-${i}`}
            >
              <View style={styles.itemRow}>
                <TextInput
                  testID={`scan-item-name-${i}`}
                  value={it.name}
                  onChangeText={(v) => updateItem(it.id, { name: v })}
                  placeholder="Descrizione prodotto"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable
                  testID={`scan-item-del-${i}`}
                  onPress={() => removeItem(it.id)}
                  style={styles.itemDelBtn}
                >
                  <FeatherIcon
                    name="x"
                    size={16}
                    color={colors.brandSecondary}
                  />
                </Pressable>
              </View>
              <View style={styles.itemRow}>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceSym}>{info.symbol}</Text>
                  <TextInput
                    testID={`scan-item-price-${i}`}
                    value={it.priceStr}
                    onChangeText={(v) => updateItem(it.id, { priceStr: v })}
                    placeholder={info.decimals === 0 ? "0" : "0,00"}
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                    style={styles.priceInput}
                  />
                </View>
                <View style={styles.qtyWrap}>
                  <Text style={styles.qtyLabel}>×</Text>
                  <TextInput
                    testID={`scan-item-qty-${i}`}
                    value={it.qty ? String(it.qty) : ""}
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      updateItem(it.id, { qty: isFinite(n) && n > 0 ? n : undefined });
                    }}
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={styles.qtyInput}
                  />
                </View>
              </View>
              {invalid && (
                <Text style={styles.invalidText}>
                  ⚠ Correggi questa riga per salvare
                </Text>
              )}
            </View>
          );
        })}

        <Pressable testID="scan-add-item" onPress={addItem} style={styles.addItem}>
          <FeatherIcon name="plus" size={16} color={colors.brandPrimary} />
          <Text style={styles.addItemText}>Aggiungi riga</Text>
        </Pressable>

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chipRow}>
          {expenseCats.map((c) => {
            const active = categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                testID={`scan-cat-${c.id}`}
                onPress={() => setCategoryId(c.id)}
                style={[
                  styles.chip,
                  active && {
                    borderColor: colors.brandSecondary,
                    backgroundColor: colors.brandSecondary + "22",
                  },
                ]}
              >
                <FeatherIcon
                  name={c.icon as any}
                  size={14}
                  color={active ? colors.brandSecondary : colors.onSurfaceSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    active && { color: colors.brandSecondary, fontWeight: "700" },
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Sezione da cui pagare</Text>
        <View style={styles.chipRow}>
          {sections.map((s) => {
            const active = sectionId === s.id;
            return (
              <Pressable
                key={s.id}
                testID={`scan-sec-${s.id}`}
                onPress={() => setSectionId(s.id)}
                style={[
                  styles.chip,
                  active && {
                    borderColor: colors.brandSecondary,
                    backgroundColor: colors.brandSecondary + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && { color: colors.brandSecondary, fontWeight: "700" },
                  ]}
                >
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating bottom bar with total + save */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>
            Totale {items.length} {items.length === 1 ? "voce" : "voci"}
          </Text>
          <Text style={styles.totalValue} testID="scan-total">
            {format(total / (currency === "EUR" ? 1 : rates?.rates[currency] ?? 1)).replace("-", "")}
          </Text>
          {invalidCount > 0 && (
            <Text style={styles.invalidText}>
              {invalidCount} {invalidCount === 1 ? "riga" : "righe"} da correggere
            </Text>
          )}
        </View>
        <Pressable
          testID="scan-save"
          onPress={requestSave}
          disabled={!canSave}
          style={[
            styles.saveBtn,
            !canSave && { opacity: 0.4 },
          ]}
        >
          <FeatherIcon name="check" size={18} color={colors.onSurface} />
          <Text style={styles.saveBtnText}>Salva</Text>
        </Pressable>
      </View>

      {confirmOpen && (
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Confermi il salvataggio?</Text>
            <Text style={styles.confirmText}>
              Stai per registrare un'uscita di{" "}
              <Text style={{ color: colors.brandSecondary, fontWeight: "800" }}>
                {format(total / (currency === "EUR" ? 1 : rates?.rates[currency] ?? 1)).replace("-", "")}
              </Text>{" "}
              da "{store}". {items.length}{" "}
              {items.length === 1 ? "voce" : "voci"} verranno conservate con lo
              scontrino.
            </Text>
            <View style={styles.rowCta}>
              <Pressable
                testID="scan-confirm-cancel"
                onPress={() => setConfirmOpen(false)}
                style={[styles.btn, { backgroundColor: colors.surfaceTertiary, flex: 1 }]}
              >
                <Text style={styles.btnText}>Annulla</Text>
              </Pressable>
              <Pressable
                testID="scan-confirm-yes"
                onPress={doSave}
                disabled={saving}
                style={[
                  styles.btn,
                  { backgroundColor: colors.brandSecondary, flex: 1 },
                ]}
              >
                <Text style={styles.btnText}>
                  {saving ? "Salvo…" : "Sì, salva"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable testID="scan-back" onPress={onBack} style={styles.backBtn}>
        <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.topbarTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topbar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topbarTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "700",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  hero: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandPrimary + "22",
    borderWidth: 1,
    borderColor: colors.brandPrimary + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSub: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  pickRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  pickBtn: {
    width: 130,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 8,
  },
  pickLabel: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
  },
  primaryBtnText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
  },
  preview: {
    width: 160,
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  thumbnail: {
    width: "100%",
    height: 120,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    opacity: 0.85,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.onSurface,
    fontSize: 14,
  },
  item: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
    marginBottom: spacing.sm,
  },
  itemInvalid: {
    borderColor: colors.brandSecondary,
    backgroundColor: colors.brandSecondary + "08",
  },
  itemRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  itemDelBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSecondary + "11",
    borderWidth: 1,
    borderColor: colors.brandSecondary + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  priceWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  priceSym: { color: colors.muted, fontSize: 15, fontWeight: "600" },
  priceInput: {
    flex: 1,
    padding: 10,
    color: colors.onSurface,
    fontSize: 14,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  qtyLabel: { color: colors.muted, fontSize: 15, fontWeight: "600" },
  qtyInput: {
    flex: 1,
    padding: 10,
    color: colors.onSurface,
    fontSize: 14,
    textAlign: "right",
  },
  invalidText: {
    color: colors.brandSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  addItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary + "66",
    backgroundColor: colors.brandPrimary + "11",
  },
  addItemText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  totalValue: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.brandSecondary,
    borderRadius: radius.pill,
  },
  saveBtnText: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "800",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  confirmBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  confirmTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  confirmText: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 20 },
  rowCta: { flexDirection: "row", gap: spacing.sm },
  btn: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnText: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  error: {
    color: colors.brandSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
