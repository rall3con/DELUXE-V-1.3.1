import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import { colors, radius, spacing } from "@/src/theme";
import { hasPin, isBiometricEnabled } from "@/src/security";
import { useAppState } from "@/src/store";
import { useCurrency } from "@/src/currency";

export default function SettingsIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const state = useAppState();
  const { info } = useCurrency();
  const [pinSet, setPinSet] = useState(false);
  const [bioOn, setBioOn] = useState(false);

  useEffect(() => {
    (async () => {
      setPinSet(await hasPin());
      setBioOn(await isBiometricEnabled());
    })();
  }, []);

  const recurringCount = state?.recurring.length ?? 0;
  const billsCount = state?.bills.filter((b) => !b.archived).length ?? 0;
  const customCats = state?.categories.filter((c) => !c.builtIn && !c.archived).length ?? 0;

  const items: {
    testID: string;
    icon: string;
    title: string;
    sub: string;
    route: any;
    accent?: string;
  }[] = [
    {
      testID: "settings-recurring",
      icon: "repeat",
      title: "Movimenti ricorrenti",
      sub: recurringCount === 0 ? "Automatizza stipendi, affitti, abbonamenti" : `${recurringCount} regole attive`,
      route: "/settings/recurring",
      accent: colors.brandTertiary,
    },
    {
      testID: "settings-bills",
      icon: "calendar",
      title: "Scadenze bollette",
      sub: billsCount === 0 ? "Promemoria in-app alla prossima apertura" : `${billsCount} scadenze gestite`,
      route: "/settings/bills",
      accent: colors.warning,
    },
    {
      testID: "settings-categories",
      icon: "tag",
      title: "Categorie",
      sub: customCats === 0 ? "Personalizza entrate e uscite" : `${customCats} categorie personalizzate`,
      route: "/settings/categories",
      accent: colors.brandPrimary,
    },
    {
      testID: "settings-security",
      icon: "lock",
      title: "Sicurezza",
      sub: pinSet
        ? bioOn
          ? "PIN attivo · biometria attiva"
          : "PIN attivo"
        : "Nessuna protezione",
      route: "/settings/security",
      accent: colors.brandSecondary,
    },
    {
      testID: "settings-ai",
      icon: "camera",
      title: "Scanner scontrini",
      sub: "Chiave Gemini per leggere scontrini",
      route: "/settings/ai",
      accent: colors.info,
    },
    {
      testID: "settings-server",
      icon: "server",
      title: "Server",
      sub: "URL del backend (Emergent o self-host)",
      route: "/settings/server",
      accent: colors.info,
    },
  ];

  return (
    <View style={styles.container} testID="settings-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Pressable
          testID="settings-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <FeatherIcon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Impostazioni</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {items.map((it) => (
          <Pressable
            key={it.testID}
            testID={it.testID}
            onPress={() => router.push(it.route)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: (it.accent ?? colors.brandPrimary) + "22",
                  borderColor: (it.accent ?? colors.brandPrimary) + "44",
                },
              ]}
            >
              <FeatherIcon
                name={it.icon as any}
                size={18}
                color={it.accent ?? colors.brandPrimary}
              />
            </View>
            <View style={styles.body}>
              <Text style={styles.rowTitle}>{it.title}</Text>
              <Text style={styles.rowSub}>{it.sub}</Text>
            </View>
            <FeatherIcon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))}

        <View style={styles.infoRow}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <FeatherIcon name="globe" size={18} color={colors.muted} />
          </View>
          <View style={styles.body}>
            <Text style={styles.rowTitle}>Valuta visualizzata</Text>
            <Text style={styles.rowSub}>
              {info.flag} {info.code} · {info.name}
            </Text>
          </View>
          <Text style={styles.hint}>Dalla Home</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tutti i dati vengono salvati solo sul tuo dispositivo.
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
  title: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  rowTitle: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "700",
  },
  rowSub: {
    color: colors.muted,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  hint: {
    color: colors.muted,
    fontSize: 11,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  footerText: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
  },
});
