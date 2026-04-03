import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
import { colors, spacing, radii, typography } from "../theme";

const SCORE_COLORS = {
  green: { stroke: "#22c55e", text: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  yellow: { stroke: "#eab308", text: "#eab308", bg: "rgba(234,179,8,0.12)" },
  red: { stroke: "#ef4444", text: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

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

  const R = 80;
  const CX = 100;
  const CY = 100;
  const startAngle = -180;
  const scoreAngle = startAngle + (score / 100) * 180;

  const trackStart = polarToXY(CX, CY, R, startAngle);
  const trackEnd = polarToXY(CX, CY, R, 0);
  const fillEnd = polarToXY(CX, CY, R, scoreAngle);
  const needleTip = polarToXY(CX, CY, R - 10, scoreAngle);

  const largeFillArc = score > 50 ? 1 : 0;

  const segments = [
    { from: -180, to: -126, col: "#22c55e" },
    { from: -126, to: -72, col: "#86efac" },
    { from: -72, to: -36, col: "#eab308" },
    { from: -36, to: 0, col: "#ef4444" },
  ];

  return (
    <View style={styles.container}>
      {/* SVG Gauge */}
      <View style={styles.gaugeWrapper}>
        <Svg width={220} height={120} viewBox="0 0 200 110">
          {/* Background track */}
          <Path
            d={`M ${trackStart.x} ${trackStart.y} A ${R} ${R} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Zone segments */}
          {segments.map((seg, i) => {
            const s = polarToXY(CX, CY, R, seg.from);
            const e = polarToXY(CX, CY, R, seg.to);
            const large = seg.to - seg.from > 180 ? 1 : 0;
            return (
              <Path
                key={i}
                d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`}
                fill="none"
                stroke={seg.col}
                strokeWidth="14"
                strokeLinecap="butt"
                opacity="0.25"
              />
            );
          })}

          {/* Fill arc */}
          {score > 0 && (
            <Path
              d={`M ${trackStart.x} ${trackStart.y} A ${R} ${R} 0 ${largeFillArc} 1 ${fillEnd.x} ${fillEnd.y}`}
              fill="none"
              stroke={c.stroke}
              strokeWidth="14"
              strokeLinecap="round"
            />
          )}

          {/* Needle */}
          <Line
            x1={CX}
            y1={CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Circle cx={CX} cy={CY} r="5" fill="white" opacity="0.9" />

          {/* Labels */}
          <SvgText x="18" y="108" fill="#22c55e" fontSize="9" fontWeight="600">
            0
          </SvgText>
          <SvgText
            x="90"
            y="18"
            fill="#eab308"
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
          >
            50
          </SvgText>
          <SvgText
            x="178"
            y="108"
            fill="#ef4444"
            fontSize="9"
            fontWeight="600"
          >
            100
          </SvgText>
        </Svg>

        {/* Score number overlay */}
        <View style={styles.scoreOverlay}>
          <Text style={[styles.scoreNumber, { color: c.text }]}>{score}</Text>
        </View>
      </View>

      {/* Label badge */}
      <View style={[styles.labelBadge, { backgroundColor: c.bg }]}>
        <Text style={[styles.labelText, { color: c.text }]}>{label}</Text>
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
  gaugeWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreOverlay: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
  },
  labelBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  labelText: {
    fontSize: typography.sm,
    fontWeight: "700",
  },
  breakdownContainer: {
    width: "100%",
    marginTop: spacing.xl,
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
    fontVariant: ["tabular-nums"],
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
