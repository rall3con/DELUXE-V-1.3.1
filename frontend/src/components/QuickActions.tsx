import FeatherIcon from "@react-native-vector-icons/feather";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/theme";

export type QuickActionProps = {
  onIncome: () => void;
  onExpense: () => void;
  onTransfer: () => void;
  onScan: () => void;
};

export function QuickActions({ onIncome, onExpense, onTransfer, onScan }: QuickActionProps) {
  return (
    <View style={styles.row}>
      <ActionButton
        testID="quick-action-income"
        label="Entrata"
        icon="arrow-down-left"
        color={colors.brandTertiary}
        onPress={onIncome}
      />
      <ActionButton
        testID="quick-action-expense"
        label="Uscita"
        icon="arrow-up-right"
        color={colors.brandSecondary}
        onPress={onExpense}
      />
      <ActionButton
        testID="quick-action-transfer"
        label="Trasferisci"
        icon="repeat"
        color={colors.brandPrimary}
        onPress={onTransfer}
      />
      <ActionButton
        testID="quick-action-scan"
        label="Scontrino"
        icon="camera"
        color={colors.info}
        onPress={onScan}
      />
    </View>
  );
}

function ActionButton({
  label,
  icon,
  color,
  onPress,
  testID,
}: {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + "22", borderColor: color + "44" }]}>
        <FeatherIcon name={icon as any} color={color} size={20} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  label: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: "600",
  },
});
