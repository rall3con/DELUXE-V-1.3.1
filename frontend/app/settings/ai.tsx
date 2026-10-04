import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODELS,
  getGeminiKey,
  getGeminiModel,
  setGeminiKey,
  setGeminiModel,
} from "@/src/gemini";
import { colors, radius, spacing } from "@/src/theme";

export default function AiSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    (async () => {
      const k = await getGeminiKey();
      if (k) {
        setKey(k);
        setExisting(true);
      }
      setModel(await getGeminiModel());
    })();
  }, []);

  const save = async () => {
    await setGeminiKey(key.trim() || null);
    await setGeminiModel(model);
    setExisting(!!key.trim());
    setSaved("ok");
    setTimeout(() => setSaved(null), 2500);
  };

  const remove = async () => {
    await setGeminiKey(null);
    setKey("");
    setExisting(false);
    setSaved("ok");
    setTimeout(() => setSaved(null), 2500);
  };

  const masked =
    key.length > 8 ? "•".repeat(key.length - 4) + key.slice(-4) : key;

  return (
    <View style={styles.container} testID="ai-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Pressable
          testID="ai-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Scanner scontrini</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <FeatherIcon name="key" size={18} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>API key Gemini</Text>
              <Text style={styles.rowSub}>
                {existing ? "Chiave salvata sul dispositivo" : "Non impostata"}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Chiave API</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="ai-key-input"
              value={reveal ? key : masked}
              onChangeText={(v) => {
                setReveal(true);
                setKey(v);
              }}
              placeholder="AIza..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!reveal && key.length > 0}
              style={styles.input}
            />
            <Pressable
              testID="ai-reveal"
              onPress={() => setReveal((r) => !r)}
              style={styles.eyeBtn}
            >
              <FeatherIcon
                name={reveal ? "eye-off" : "eye"}
                size={18}
                color={colors.onSurface}
              />
            </Pressable>
          </View>

          <Pressable
            testID="ai-open-studio"
            onPress={() => Linking.openURL("https://aistudio.google.com/apikey")}
            style={styles.linkRow}
          >
            <FeatherIcon name="external-link" size={14} color={colors.brandPrimary} />
            <Text style={styles.linkText}>
              Ottieni una chiave gratuita su Google AI Studio
            </Text>
          </Pressable>

          <Text style={styles.label}>Modello</Text>
          <View style={styles.chipRow}>
            {GEMINI_MODELS.map((m) => {
              const active = model === m.id;
              return (
                <Pressable
                  key={m.id}
                  testID={`ai-model-${m.id}`}
                  onPress={() => setModel(m.id)}
                  style={[
                    styles.chip,
                    active && {
                      borderColor: colors.brandPrimary,
                      backgroundColor: colors.brandPrimary + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && { color: colors.brandPrimary, fontWeight: "700" },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {saved === "ok" && (
            <Text style={styles.ok} testID="ai-saved">
              Salvato
            </Text>
          )}

          <View style={styles.actions}>
            {existing && (
              <Pressable
                testID="ai-remove"
                onPress={remove}
                style={[styles.btn, { backgroundColor: colors.brandSecondary }]}
              >
                <Text style={styles.btnText}>Rimuovi chiave</Text>
              </Pressable>
            )}
            <Pressable
              testID="ai-save"
              onPress={save}
              style={[styles.btn, { backgroundColor: colors.brandPrimary, flex: 1 }]}
            >
              <Text style={styles.btnText}>Salva</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: colors.info + "22",
                  borderColor: colors.info + "44",
                },
              ]}
            >
              <FeatherIcon name="info" size={16} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Come funziona</Text>
            </View>
          </View>
          <Text style={styles.hint}>
            La tua chiave viene salvata solo sul dispositivo (archivio sicuro).
            Non viene inviata ai nostri server. Le foto degli scontrini vengono
            spedite direttamente alle API Google con la tua chiave.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary + "22",
    borderWidth: 1,
    borderColor: colors.brandPrimary + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.onSurface,
    fontSize: 14,
  },
  eyeBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  linkText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  ok: { color: colors.brandTertiary, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
