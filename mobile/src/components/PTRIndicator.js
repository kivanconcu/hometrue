import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radii, typography } from "../theme";

export default function PTRIndicator({ ptr, benchmark, monthly_rent }) {
  const isGreen = benchmark === "buy";
  const isRed = benchmark === "rent";

  const accentColor = isGreen ? colors.green : isRed ? colors.red : colors.yellow;
  const bgColor = isGreen
    ? colors.greenDim
    : isRed
    ? colors.redDim
    : colors.yellowDim;
  const borderColor = isGreen
    ? colors.greenBorder
    : isRed
    ? colors.redBorder
    : colors.yellowBorder;

  const signalLabel = isGreen ? "Buy Signal" : isRed ? "Rent Signal" : "Neutral";

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {/* Main ratio + signal */}
      <View style={styles.mainRow}>
        <View style={styles.ratioBlock}>
          <Text style={styles.ratioLabel}>Price-to-Rent Ratio</Text>
          <Text style={[styles.ratioValue, { color: accentColor }]}>
            {ptr != null ? ptr.toFixed(1) : "—"}
          </Text>
        </View>

        <View style={styles.signalBlock}>
          <Text style={[styles.signalLabel, { color: accentColor }]}>
            {signalLabel}
          </Text>
          <Text style={styles.rentLabel}>
            Est. monthly rent:{" "}
            <Text style={styles.rentValue}>
              {monthly_rent != null
                ? `$${monthly_rent.toLocaleString()}`
                : "N/A"}
            </Text>
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendItem, { color: colors.green }]}>
          {"< 15  — Buy"}
        </Text>
        <Text style={[styles.legendItem, { color: colors.yellow }]}>
          {"15–20 — Neutral"}
        </Text>
        <Text style={[styles.legendItem, { color: colors.red }]}>
          {"> 20  — Rent"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xl,
    flexWrap: "wrap",
  },
  ratioBlock: {
    gap: 2,
  },
  ratioLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  ratioValue: {
    fontSize: typography.xxxl,
    fontWeight: "900",
    lineHeight: 36,
  },
  signalBlock: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  signalLabel: {
    fontSize: typography.lg,
    fontWeight: "700",
  },
  rentLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  rentValue: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  legendItem: {
    fontSize: typography.xs,
    fontVariant: ["tabular-nums"],
  },
});
