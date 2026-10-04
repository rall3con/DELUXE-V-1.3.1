import FeatherIcon from "@react-native-vector-icons/feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCurrency } from "@/src/currency";
import { deleteTransaction, useAppState } from "@/src/store";
import { resolveCategory } from "@/src/types";
import { colors, radius, spacing } from "@/src/theme";

export default function TransactionDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const { format } = useCurrency();
  const [confirming, setConfirming] = useState(false);

  const tx = useMemo(
    () => state?.transactions.find((t) => t.id === id) ?? null,
    [state, id],
  );
  const section = useMemo(
    () => state?.sections.find((s) => s.id === tx?.sectionId) ?? null,
    [state, tx],
  );

  if (!state) return <View style={styles.container} />;
  if (!tx) {
    return (
      <View style={styles.container}>
        <TopBar onBack={() => router.back()} title="Movimento" />
        <View style={styles.centered}>
          <FeatherIcon name="file-text" size={28} color={colors.muted} />
          <Text style={styles.emptyText}>Movimento non trovato</Text>
        </View>
      </View>
    );
  }

  const cat = resolveCategory(tx.category, state.categories);
  const isIncome = tx.type === "income";
  const isExpense = tx.type === "expense";
  const isTransfer = tx.type === "transfer";
  const accent = isIncome
    ? colors.brandTertiary
    : isExpense
    ? colors.brandSecondary
    : colors.brandPrimary;
  const sign = isIncome ? "+" : isExpense ? "-" : "";

  const d = new Date(tx.createdAt);
  const dateStr = d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.container} testID="tx-detail-screen">
      <TopBar
        onBack={() => router.back()}
        title={
          tx.receipt
            ? "Scontrino"
            : isTransfer
            ? "Trasferimento"
            : isIncome
            ? "Entrata"
            : "Uscita"
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.md,
        }}
      >
        {/* Amount hero */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.iconBig,
              {
                backgroundColor: accent + "22",
                borderColor: accent + "44",
              },
            ]}
          >
            <FeatherIcon
              name={(tx.receipt ? "shopping-bag" : (cat.icon as any)) as any}
              size={28}
              color={accent}
            />
          </View>
          <Text style={[styles.amount, { color: accent }]} testID="tx-detail-amount">
            {sign}
            {format(tx.amount).replace("-", "")}
          </Text>
          <Text style={styles.subtitle}>
            {tx.receipt ? tx.receipt.store : cat.name}
          </Text>
        </View>

        {/* Metadata */}
        <View style={styles.card}>
          <Row label="Data" value={`${dateStr} · ${timeStr}`} />
          <Divider />
          <Row label="Sezione" value={section?.name ?? "—"} />
          <Divider />
          <Row label="Categoria" value={cat.name} />
          {tx.note && !tx.receipt && (
            <>
              <Divider />
              <Row label="Nota" value={tx.note} />
            </>
          )}
        </View>

        {/* Receipt items */}
        {tx.receipt && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FeatherIcon name="list" size={16} color={colors.brandPrimary} />
              <Text style={styles.cardHeaderText}>
                Articoli ({tx.receipt.items.length})
              </Text>
            </View>
            {tx.receipt.items.map((it, i) => (
              <View key={i} style={styles.itemRow} testID={`tx-detail-item-${i}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {it.name}
                  </Text>
                  {it.qty && it.qty > 1 && (
                    <Text style={styles.itemQty}>× {it.qty}</Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>
                  {format(it.price * (it.qty ?? 1))}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Totale</Text>
              <Text style={styles.totalValue}>{format(tx.amount)}</Text>
            </View>
          </View>
        )}

        <Pressable
          testID="tx-detail-delete"
          onPress={() => setConfirming(true)}
          style={styles.deleteBtn}
        >
          <FeatherIcon name="trash-2" size={16} color={colors.brandSecondary} />
          <Text style={styles.deleteBtnText}>Elimina movimento</Text>
        </Pressable>
      </ScrollView>

      {confirming && (
        <View style={styles.overlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Eliminare il movimento?</Text>
            <Text style={styles.confirmText}>
              Il saldo verrà ricalcolato automaticamente.
            </Text>
            <View style={styles.rowCta}>
              <Pressable
                testID="tx-detail-cancel"
                onPress={() => setConfirming(false)}
                style={[styles.btn, { backgroundColor: colors.surfaceTertiary, flex: 1 }]}
              >
                <Text style={styles.btnText}>Annulla</Text>
              </Pressable>
              <Pressable
                testID="tx-detail-confirm"
                onPress={async () => {
                  await deleteTransaction(tx.id);
                  setConfirming(false);
                  router.back();
                }}
                style={[styles.btn, { backgroundColor: colors.brandSecondary, flex: 1 }]}
              >
                <Text style={styles.btnText}>Elimina</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.topbar,
        { paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm },
      ]}
    >
      <Pressable testID="tx-detail-back" onPress={onBack} style={styles.backBtn}>
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
    gap: 8,
  },
  emptyText: { color: colors.muted, fontSize: 13 },
  heroCard: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  iconBig: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.onSurfaceSecondary,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  cardHeaderText: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  rowValue: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  itemRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemName: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "600",
  },
  itemQty: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: "800",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brandSecondary + "11",
    borderWidth: 1,
    borderColor: colors.brandSecondary + "33",
    marginTop: spacing.md,
  },
  deleteBtnText: {
    color: colors.brandSecondary,
    fontSize: 13,
    fontWeight: "700",
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
  confirmText: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 18 },
  rowCta: { flexDirection: "row", gap: spacing.sm },
  btn: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnText: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
});
