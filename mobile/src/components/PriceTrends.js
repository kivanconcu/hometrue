import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, spacing, radii, typography } from "../theme";

function TrendRow({ year, index, change }) {
  const isPositive = change >= 0;
  return (
    <View style={styles.trendRow}>
      <Text style={styles.trendYear}>{year}</Text>
      <View style={styles.trendBar}>
        <View
          style={[
            styles.trendFill,
            {
              width: `${Math.min(Math.abs(change) * 5, 100)}%`,
              backgroundColor: isPositive ? colors.green : colors.red,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.trendChange,
          { color: isPositive ? colors.green : colors.red },
        ]}
      >
        {isPositive ? "+" : ""}
        {change.toFixed(1)}%
      </Text>
    </View>
  );
}

export default function PriceTrends({ trends }) {
  if (!trends || trends.length === 0) {
    return (
      <Text style={styles.emptyText}>No historical trend data available.</Text>
    );
  }

  // trends is expected to be an array of { year, index, annual_change } or similar
  const displayTrends = trends.slice(-10); // show last 10 entries

  return (
    <View style={styles.container}>
      <Text style={styles.sectionNote}>
        FHFA House Price Index — Annual Change
      </Text>

      {displayTrends.map((t, i) => {
        const change =
          t.annual_change != null
            ? t.annual_change
            : i > 0
            ? ((t.index - displayTrends[i - 1].index) /
                displayTrends[i - 1].index) *
              100
            : 0;
        return (
          <TrendRow
            key={i}
            year={t.year || t.date || String(i)}
            index={t.index}
            change={change}
          />
        );
      })}

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        {(() => {
          const validChanges = displayTrends
            .map((t, i) =>
              i > 0
                ? ((t.index - displayTrends[i - 1].index) /
                    displayTrends[i - 1].index) *
                  100
                : null
            )
            .filter((c) => c != null);
          if (!validChanges.length) return null;
          const avg = validChanges.reduce((s, v) => s + v, 0) / validChanges.length;
          const latest = validChanges[validChanges.length - 1];
          return (
            <>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Avg Annual Change</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: avg >= 0 ? colors.green : colors.red },
                  ]}
                >
                  {avg >= 0 ? "+" : ""}
                  {avg.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>Most Recent</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: latest >= 0 ? colors.green : colors.red },
                  ]}
                >
                  {latest >= 0 ? "+" : ""}
                  {latest.toFixed(1)}%
                </Text>
              </View>
            </>
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  sectionNote: {
    color: colors.textMuted,
    fontSize: typography.xs,
    marginBottom: spacing.xs,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 3,
  },
  trendYear: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    width: 40,
    fontVariant: ["tabular-nums"],
  },
  trendBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.full,
    overflow: "hidden",
  },
  trendFill: {
    height: "100%",
    borderRadius: radii.full,
  },
  trendChange: {
    fontSize: typography.xs,
    width: 48,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryTile: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: typography.base,
    fontWeight: "700",
    marginTop: 2,
  },
});
