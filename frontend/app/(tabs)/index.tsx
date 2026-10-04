import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FeatherIcon from "@react-native-vector-icons/feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { QuickActions } from "@/src/components/QuickActions";
import { SectionCard } from "@/src/components/SectionCard";
import { TransactionItem } from "@/src/components/TransactionItem";
import {
  AddTransactionSheet,
  AddTransactionSheetRef,
} from "@/src/components/AddTransactionSheet";
import {
  AddSectionSheet,
  AddSectionSheetRef,
} from "@/src/components/AddSectionSheet";
import {
  monthlyStats,
  totalBalance,
  upcomingBills,
  useAppState,
} from "@/src/store";
import { useCurrency } from "@/src/currency";
import {
  CurrencyPicker,
  CurrencyPickerRef,
} from "@/src/components/CurrencyPicker";
import { UpcomingBillBanner } from "@/src/components/UpcomingBillBanner";
import { colors, radius, spacing } from "@/src/theme";

const HERO_BG =
  "https://images.unsplash.com/photo-1557264322-b44d383a2906?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjBncmVlbiUyMHBpbmslMjBwdXJwbGUlMjBuZW9ufGVufDB8fHx8MTc5MDk2MTk3MXww&ixlib=rb-4.1.0&q=85";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const state = useAppState();
  const router = useRouter();
  const { format, info } = useCurrency();
  const txSheetRef = useRef<AddTransactionSheetRef>(null);
  const sectionSheetRef = useRef<AddSectionSheetRef>(null);
  const currencySheetRef = useRef<CurrencyPickerRef>(null);

  if (!state) {
    return <View style={styles.container} testID="home-loading" />;
  }

  const total = totalBalance(state);
  const stats = monthlyStats(state);
  const recent = state.transactions.slice(0, 5);
  const bills = upcomingBills(state.bills);
  const sectionById = Object.fromEntries(state.sections.map((s) => [s.id, s.name]));

  return (
    <View style={styles.container} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero / balance card */}
        <View
          style={[
            styles.hero,
            { paddingTop: insets.top + spacing.lg },
          ]}
        >
          <Image
            source={{ uri: HERO_BG }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={["rgba(5,5,5,0.4)", "rgba(5,5,5,0.9)", colors.surface]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.heroHeader}>
            <Text style={styles.greeting}>Ciao 👋</Text>
            <View style={styles.heroActions}>
              <Pressable
                testID="header-currency"
                onPress={() => currencySheetRef.current?.open()}
                style={styles.currencyChip}
              >
                <Text style={styles.currencyFlag}>{info.flag}</Text>
                <Text style={styles.currencyCode}>{info.code}</Text>
                <FeatherIcon
                  name="chevron-down"
                  size={14}
                  color={colors.onSurface}
                />
              </Pressable>
              <Pressable
                testID="header-add-section"
                onPress={() => sectionSheetRef.current?.open()}
                style={styles.headerBtn}
              >
                <FeatherIcon name="plus" color={colors.onSurface} size={18} />
              </Pressable>
              <Pressable
                testID="header-settings"
                onPress={() => router.push("/settings")}
                style={styles.headerBtn}
              >
                <FeatherIcon name="settings" color={colors.onSurface} size={18} />
              </Pressable>
            </View>
          </View>

          <View style={styles.balanceWrap}>
            <Text style={styles.balanceLabel}>Saldo Totale</Text>
            <Text style={styles.balance} testID="home-total-balance">
              {format(total)}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <FeatherIcon
                  name="arrow-down-left"
                  size={14}
                  color={colors.brandTertiary}
                />
                <View>
                  <Text style={styles.statLabel}>Entrate (mese)</Text>
                  <Text style={[styles.statValue, { color: colors.brandTertiary }]} testID="home-month-income">
                    +{format(stats.income).replace("-", "")}
                  </Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <FeatherIcon
                  name="arrow-up-right"
                  size={14}
                  color={colors.brandSecondary}
                />
                <View>
                  <Text style={styles.statLabel}>Uscite (mese)</Text>
                  <Text style={[styles.statValue, { color: colors.brandSecondary }]} testID="home-month-expense">
                    -{format(stats.expense).replace("-", "")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ paddingTop: spacing.lg }}>
          <QuickActions
            onIncome={() => txSheetRef.current?.open("income")}
            onExpense={() => txSheetRef.current?.open("expense")}
            onTransfer={() => txSheetRef.current?.open("transfer")}
            onScan={() => router.push("/receipt-scan")}
          />
        </View>

        {/* Upcoming bills banner */}
        <UpcomingBillBanner
          bills={bills}
          onManage={() => router.push("/settings/bills")}
        />

        {/* Sections */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Le tue Sezioni</Text>
            <Pressable
              testID="see-all-sections"
              onPress={() => router.push("/(tabs)/sections")}
            >
              <Text style={styles.link}>Vedi tutte</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
          >
            {state.sections.map((s) => (
              <SectionCard key={s.id} section={s} />
            ))}
            <Pressable
              testID="add-section-card"
              onPress={() => sectionSheetRef.current?.open()}
              style={styles.addSectionCard}
            >
              <FeatherIcon name="plus" size={28} color={colors.brandPrimary} />
              <Text style={styles.addSectionText}>Nuova Sezione</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Recent transactions */}
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Movimenti recenti</Text>
            <Pressable
              testID="see-all-tx"
              onPress={() => router.push("/(tabs)/transactions")}
            >
              <Text style={styles.link}>Vedi tutti</Text>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: spacing.lg }}>
            {recent.length === 0 ? (
              <View style={styles.empty} testID="empty-tx">
                <FeatherIcon name="inbox" size={28} color={colors.muted} />
                <Text style={styles.emptyText}>Nessun movimento ancora</Text>
                <Text style={styles.emptySubtext}>
                  Tocca "+ Entrata" o "- Uscita" per iniziare
                </Text>
              </View>
            ) : (
              recent.map((t) => (
                <TransactionItem
                  key={t.id}
                  tx={t}
                  sectionName={sectionById[t.sectionId] ?? "—"}
                  destName={t.toSectionId ? sectionById[t.toSectionId] : undefined}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <AddTransactionSheet ref={txSheetRef} sections={state.sections} />
      <AddSectionSheet ref={sectionSheetRef} />
      <CurrencyPicker ref={currencySheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: "hidden",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "600",
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyFlag: {
    fontSize: 14,
  },
  currencyCode: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceWrap: {
    marginTop: spacing.xl,
    alignItems: "center",
  },
  balanceLabel: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  balance: {
    color: colors.onSurface,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.2,
    marginTop: 6,
  },
  statsRow: {
    marginTop: spacing.xl,
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  block: {
    marginTop: spacing.xl,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  blockTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "700",
  },
  link: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  addSectionCard: {
    width: 160,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary + "66",
    backgroundColor: colors.brandPrimary + "11",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addSectionText: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtext: {
    color: colors.muted,
    fontSize: 12,
  },
});
