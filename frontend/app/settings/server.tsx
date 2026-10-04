import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getBackendUrl,
  getDefaultBackendUrl,
  getOverrideBackendUrl,
  initBackendUrl,
  setBackendUrlOverride,
} from "@/src/config";
import { colors, radius, spacing } from "@/src/theme";

export default function ServerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [override, setOverride] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<null | "ok" | "err">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await initBackendUrl();
      refresh();
    })();
  }, []);

  const refresh = () => {
    setCurrent(getBackendUrl());
    setOverride(getOverrideBackendUrl());
    setDraft(getOverrideBackendUrl() ?? "");
  };

  const save = async () => {
    setError(null);
    const url = draft.trim();
    if (!url) {
      setError("Inserisci un URL o usa 'Ripristina'");
      return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
      setError("L'URL deve iniziare con http:// o https://");
      return;
    }
    try {
      await setBackendUrlOverride(url);
      setSaved("ok");
      refresh();
      setTimeout(() => setSaved(null), 2500);
    } catch {
      setSaved("err");
    }
  };

  const reset = async () => {
    await setBackendUrlOverride(null);
    refresh();
    setSaved("ok");
    setTimeout(() => setSaved(null), 2500);
  };

  return (
    <View style={styles.container} testID="server-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Pressable
          testID="srv-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Server</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <View style={styles.card}>
          <View style={styles.rowHead}>
            <View style={styles.iconWrap}>
              <FeatherIcon name="server" size={18} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>In uso</Text>
              <Text style={styles.rowSub} selectable>
                {current || "—"}
              </Text>
            </View>
          </View>
          <Text style={styles.statusLine}>
            {override
              ? "Override personalizzato attivo"
              : "URL predefinito (Emergent)"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>URL personalizzato</Text>
          <TextInput
            testID="srv-url-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="https://api.miodominio.it"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Il backend deve esporre le API sotto /api e rispondere con CORS
            aperto all'origine dell'app.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}
          {saved === "ok" && (
            <Text style={styles.ok} testID="srv-saved">
              Salvato — da ora l'app userà questo server.
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              testID="srv-reset"
              onPress={reset}
              style={[styles.btn, styles.btnSecondary]}
            >
              <Text style={styles.btnText}>Ripristina default</Text>
            </Pressable>
            <Pressable
              testID="srv-save"
              onPress={save}
              style={[styles.btn, { backgroundColor: colors.brandPrimary }]}
            >
              <Text style={styles.btnText}>Salva</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.rowHead}>
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
              <Text style={styles.rowTitle}>Default Emergent</Text>
              <Text style={styles.rowSub} selectable>
                {getDefaultBackendUrl()}
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>
            Modificabile anche in modo permanente nel file{" "}
            <Text style={styles.code}>src/config.ts</Text>, variabile{" "}
            <Text style={styles.code}>DEFAULT_BACKEND_URL</Text>.
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
    opacity: 0.85,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
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
  rowTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  rowSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  statusLine: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.onSurface,
    fontSize: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  code: {
    fontFamily: "monospace",
    color: colors.onSurface,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 4,
  },
  error: { color: colors.error, fontSize: 12 },
  ok: { color: colors.brandTertiary, fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
});
