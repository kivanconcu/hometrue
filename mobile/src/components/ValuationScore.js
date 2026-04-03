import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radii, typography } from "../theme";

const SCORE_COLORS = {
  green: { text: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" },
  yellow: { text: "#eab308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)" },
  red: { text: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
};

function ScoreBar({ label, score, weight }) {
  const pct = Math.round(score || 0);
  const barColor =
    pct <= 30 ? colors.green : pct <= 60 ? colors.yellow : colors.red;

  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={barStyles.trackContainer}>
        <View style={barStyles.track}>
          <View
            style={[
              barStyles.fill,
              { width: `${pct}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
      <Text style={[barStyles.pct, { color: barColor }]}>{pct}</Text>
      <Text style={barStyles.weight}>{weight}</Text>
    </View>
  );
}

export default function ValuationScore({ valuation_score }) {
  const { score, label, color, breakdown } = valuation_score;
  const c = SCORE_COLORS[color] || SCORE_COLORS.yellow;

  const trackColor = color === "green" ? colors.green : color === "red" ? colors.red : colors.yellow;

  return (
    <View style={styles.container}>
      {/* Score display */}
      <View style={[styles.scoreCircle, { borderColor: c.border, backgroundColor: c.bg }]}>
        <Text style={[styles.scoreNumber, { color: c.text }]}>{score}</Text>
        <Text style={[styles.scoreOutOf, { color: c.text }]}>/100</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>0</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${score}%`, backgroundColor: trackColor },
            ]}
          />
          <View style={[styles.progressMarker, { left: `${score}%` }]} />
        </View>
        <Text style={styles.progressLabel}>100</Text>
      </View>

      {/* Label badge */}
      <View style={[styles.labelBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Text style={[styles.labelText, { color: c.text }]}>{label}</Text>
      </View>

      {/* Zone legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
          <Text style={styles.legendText}>Undervalued (0–30)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.yellow }]} />
          <Text style={styles.legendText}>Fair (31–60)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
          <Text style={styles.legendText}>Overvalued (61+)</Text>
        </View>
      </View>

      {/* Breakdown bars */}
      <View style={styles.breakdownContainer}>
        <View style={barStyles.headerRow}>
          <Text style={[barStyles.label, { color: colors.textSecondary }]}>
            Factor
          </Text>
          <View style={barStyles.trackContainer} />
          <Text style={barStyles.pctHeader}>Raw</Text>
          <Text style={barStyles.weight}>Wt</Text>
        </View>
        <View style={styles.divider} />
        <ScoreBar
          label="$/sqft vs Comps"
          score={breakdown?.psqft_score}
          weight="40%"
        />
        <ScoreBar
          label="Days on Market"
          score={breakdown?.dom_score}
          weight="20%"
        />
        <ScoreBar
          label="Price-to-Rent"
          score={breakdown?.ptr_score}
          weight="20%"
        />
        <ScoreBar
          label="Price Reductions"
          score={breakdown?.price_reduction_score}
          weight="10%"
        />
        <ScoreBar
          label="Tax Assessed Gap"
          score={breakdown?.tax_gap_score}
          weight="10%"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 46,
  },
  scoreOutOf: {
    fontSize: typography.sm,
    fontWeight: "600",
    opacity: 0.7,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: typography.xs,
    width: 20,
    textAlign: "center",
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.full,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.full,
  },
  progressMarker: {
    position: "absolute",
    top: -2,
    width: 3,
    height: 12,
    backgroundColor: "white",
    borderRadius: 2,
    marginLeft: -1,
  },
  labelBadge: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  labelText: {
    fontSize: typography.sm,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  breakdownContainer: {
    width: "100%",
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
});

const barStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    width: 110,
    fontSize: typography.xs,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  trackContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  track: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
  },
  pct: {
    width: 28,
    textAlign: "right",
    fontSize: typography.xs,
  },
  pctHeader: {
    width: 28,
    textAlign: "right",
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  weight: {
    width: 32,
    textAlign: "right",
    fontSize: typography.xs,
    color: colors.textMuted,
  },
});
