import FeatherIcon from "@react-native-vector-icons/feather";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";
import { Transaction, resolveCategory } from "@/src/types";
import { useAppState } from "@/src/store";
import { useCurrency } from "@/src/currency";

export function TransactionItem({
  tx,
  sectionName,
  destName,
  onLongPress,
}: {
  tx: Transaction;
  sectionName: string;
  destName?: string;
  onLongPress?: () => void;
}) {
  const { format } = useCurrency();
  const state = useAppState();
  const router = useRouter();
  const isIncome = tx.type === "income";
  const isExpense = tx.type === "expense";
  const isTransfer = tx.type === "transfer";
  const hasReceipt = !!tx.receipt;

  const accent = isIncome
    ? colors.brandTertiary
    : isExpense
    ? colors.brandSecondary
    : colors.brandPrimary;

  const resolved = resolveCategory(tx.category, state?.categories);
  const iconName = isTransfer
    ? "repeat"
    : hasReceipt
    ? "shopping-bag"
    : (resolved.icon as any);
  const title = isTransfer
    ? `Trasferimento`
    : hasReceipt
    ? tx.receipt!.store
    : resolved.name;
  const subtitle = isTransfer
    ? `${sectionName} → ${destName ?? "?"}`
    : hasReceipt
    ? `${resolved.name} · ${tx.receipt!.items.length} voci · ${sectionName}`
    : sectionName;

  const sign = isIncome ? "+" : isExpense ? "-" : "";
  const date = new Date(tx.createdAt);
  const dateStr = date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: tx.id } })}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
      testID={`transaction-${tx.id}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + "22", borderColor: accent + "44" }]}>
        <FeatherIcon name={iconName} color={accent} size={18} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {hasReceipt && (
            <View style={styles.receiptBadge} testID={`receipt-badge-${tx.id}`}>
              <FeatherIcon name="file-text" size={10} color={colors.brandPrimary} />
            </View>
          )}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle} · {dateStr}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: isIncome ? colors.brandTertiary : isExpense ? colors.brandSecondary : colors.onSurface },
        ]}
      >
        {sign}
        {format(tx.amount).replace("-", "")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  receiptBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brandPrimary + "22",
    borderWidth: 1,
    borderColor: colors.brandPrimary + "44",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
