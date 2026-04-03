import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, spacing, radii, typography } from "../theme";

function StatCard({ label, value, sub, accentColor }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accentColor ? { color: accentColor } : null]}>
        {value}
      </Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function DonutChart({ ownerPct }) {
  const r = 28;
  const cx = 32;
  const cy = 32;
  const circ = 2 * Math.PI * r;
  const ownerDash = (ownerPct / 100) * circ;

  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      {/* Background track */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={10}
      />
      {/* Owner segment */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={colors.green}
        strokeWidth={10}
        strokeDasharray={`${ownerDash} ${circ}`}
        strokeLinecap="butt"
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={0.85}
      />
    </Svg>
  );
}

export default function NeighborhoodStats({ neighborhood }) {
  const {
    median_income,
    population,
    owner_occupied_pct,
    renter_occupied_pct,
    median_annual_tax,
    median_home_value,
    effective_tax_rate,
    income_affordability_stress,
    data_source,
    is_mock,
  } = neighborhood;

  const ownerPct = owner_occupied_pct || 0;
  const renterPct = renter_occupied_pct || 0;

  return (
    <View style={styles.container}>
      {is_mock && (
        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>
            Using estimated demographic data (Census API unavailable for this ZIP).
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        <StatCard
          label="Median Household Income"
          value={median_income ? `$${median_income.toLocaleString()}` : "N/A"}
          sub="ACS 5-Year Estimate"
          accentColor={income_affordability_stress ? colors.yellow : null}
        />
        <StatCard
          label="Population"
          value={population ? population.toLocaleString() : "N/A"}
          sub="ZIP code area"
        />
        <StatCard
          label="Median Home Value"
          value={
            median_home_value ? `$${median_home_value.toLocaleString()}` : "N/A"
          }
          sub="Owner-occupied units"
        />
        <StatCard
          label="Median Annual Tax"
          value={
            median_annual_tax ? `$${median_annual_tax.toLocaleString()}` : "N/A"
          }
          sub="Owner-occ. w/ mortgage"
          accentColor={colors.blue}
        />
        <StatCard
          label="Effective Tax Rate"
          value={
            effective_tax_rate
              ? `${effective_tax_rate.toFixed(2)}%`
              : "N/A"
          }
          sub="Median tax / median value"
          accentColor={colors.blue}
        />

        {/* Owner vs Renter donut */}
        <View style={styles.donutCard}>
          <Text style={styles.statLabel}>Owner vs. Renter</Text>
          <View style={styles.donutRow}>
            <DonutChart ownerPct={ownerPct} />
            <View style={styles.donutLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
                <Text style={styles.legendPct}>{ownerPct.toFixed(0)}%</Text>
                <Text style={styles.legendLbl}>own</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
                <Text style={styles.legendPct}>{renterPct.toFixed(0)}%</Text>
                <Text style={styles.legendLbl}>rent</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {income_affordability_stress && (
        <View style={styles.stressBanner}>
          <Text style={styles.stressTitle}>Affordability Stress: </Text>
          <Text style={styles.stressBody}>
            The asking price is more than 6x the area's median household income,
            which may indicate this market is stretched beyond local buying power.
          </Text>
        </View>
      )}

      {data_source ? (
        <Text style={styles.source}>Source: {data_source}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  mockBanner: {
    backgroundColor: colors.yellowDim,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  mockBannerText: {
    color: "#fde68a",
    fontSize: typography.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "700",
  },
  statSub: {
    color: colors.textMuted,
    fontSize: typography.xs,
    marginTop: 2,
  },
  donutCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: 6,
  },
  donutLegend: {
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendPct: {
    color: colors.textPrimary,
    fontSize: typography.xs,
    fontWeight: "600",
  },
  legendLbl: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  stressBanner: {
    backgroundColor: colors.yellowDim,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  stressTitle: {
    color: "#fde68a",
    fontSize: typography.xs,
    fontWeight: "700",
  },
  stressBody: {
    color: "#fde68a",
    fontSize: typography.xs,
    lineHeight: 17,
    flex: 1,
  },
  source: {
    color: colors.textDim,
    fontSize: typography.xs,
  },
});
