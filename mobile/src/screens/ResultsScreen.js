import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropertySummary from "../components/PropertySummary";
import ValuationScore from "../components/ValuationScore";
import FlagsSection from "../components/FlagsSection";
import PTRIndicator from "../components/PTRIndicator";
import NeighborhoodStats from "../components/NeighborhoodStats";
import CompsSection from "../components/CompsSection";
import PriceTrends from "../components/PriceTrends";
import { colors, spacing, radii, typography } from "../theme";

// ─── Collapsible Section Card ─────────────────────────────────────────────────
function SectionCard({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{title}</Text>
          {badge ? <View style={styles.cardBadge}>{badge}</View> : null}
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {open ? <View style={styles.cardBody}>{children}</View> : null}
    </View>
  );
}

function BadgeGreen({ children }) {
  return (
    <View style={badgeStyles.green}>
      <Text style={badgeStyles.greenText}>{children}</Text>
    </View>
  );
}

function BadgeYellow({ children }) {
  return (
    <View style={badgeStyles.yellow}>
      <Text style={badgeStyles.yellowText}>{children}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  green: {
    backgroundColor: colors.greenDim,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  greenText: {
    color: colors.green,
    fontSize: typography.xs,
    fontWeight: "600",
  },
  yellow: {
    backgroundColor: colors.yellowDim,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  yellowText: {
    color: colors.yellow,
    fontSize: typography.xs,
    fontWeight: "600",
  },
});

// ─── Main Results Screen ──────────────────────────────────────────────────────
export default function ResultsScreen({ route, navigation }) {
  const result = route.params?.result;

  if (!result) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No result data available.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    property,
    valuation_score,
    flags,
    comps,
    neighborhood,
    trends,
    price_to_rent_ratio,
    ptr_benchmark,
    monthly_rent_estimate,
    subject_price_per_sqft,
    median_comp_price_per_sqft,
    avg_comp_price_per_sqft,
    estimated_annual_tax,
    tax_source,
    zestimate,
    zillow_url,
    disclaimer,
    rent_source,
  } = result;

  const redCount = flags?.filter((f) => f.type === "red").length ?? 0;
  const greenCount = flags?.filter((f) => f.type === "green").length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.logoSmall}>
          <Ionicons name="home" size={14} color="#0f1729" />
        </View>
        <Text style={styles.navTitle}>HomeTrue</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Disclaimer */}
        {disclaimer ? (
          <View style={styles.disclaimerBox}>
            <Ionicons
              name="warning-outline"
              size={16}
              color={colors.yellow}
              style={{ marginRight: 8, flexShrink: 0 }}
            />
            <Text style={styles.disclaimerText}>{disclaimer}</Text>
          </View>
        ) : null}

        {/* Property Summary */}
        <PropertySummary
          property={property}
          estimated_annual_tax={estimated_annual_tax}
          tax_source={tax_source}
          zestimate={zestimate}
          zillow_url={zillow_url}
        />

        {/* Valuation Score */}
        <SectionCard
          title="Overvaluation Score"
          badge={
            <BadgeGreen>
              {valuation_score?.score}/100
            </BadgeGreen>
          }
        >
          <ValuationScore valuation_score={valuation_score} />
        </SectionCard>

        {/* Flags */}
        <SectionCard
          title="Red & Green Flags"
          badge={
            <Text style={styles.flagCountText}>
              {redCount} red · {greenCount} green
            </Text>
          }
        >
          <FlagsSection flags={flags} />
        </SectionCard>

        {/* Price-to-Rent */}
        <SectionCard
          title="Price-to-Rent Ratio"
          badge={
            rent_source ? (
              <Text style={styles.sourceTag}>{rent_source}</Text>
            ) : null
          }
        >
          <PTRIndicator
            ptr={price_to_rent_ratio}
            benchmark={ptr_benchmark}
            monthly_rent={monthly_rent_estimate}
          />
        </SectionCard>

        {/* CMA / Comps */}
        <SectionCard
          title="Comparable Sales (CMA)"
          badge={
            comps?.length ? (
              <BadgeGreen>{comps.length} comps</BadgeGreen>
            ) : null
          }
        >
          {comps?.length > 0 ? (
            <CompsSection
              comps={comps}
              subject_price_per_sqft={subject_price_per_sqft}
              median_comp_price_per_sqft={median_comp_price_per_sqft}
            />
          ) : (
            <Text style={styles.emptyText}>No comparable sales found.</Text>
          )}
        </SectionCard>

        {/* Neighborhood */}
        <SectionCard
          title="Neighborhood Signals"
          badge={
            <Text style={styles.sourceTag}>U.S. Census Bureau</Text>
          }
        >
          {neighborhood ? (
            <NeighborhoodStats neighborhood={neighborhood} />
          ) : (
            <Text style={styles.emptyText}>
              No neighborhood data available.
            </Text>
          )}
        </SectionCard>

        {/* Price Trends */}
        <SectionCard
          title="Historical Price Trends"
          badge={<Text style={styles.sourceTag}>FHFA HPI</Text>}
          defaultOpen={false}
        >
          <PriceTrends trends={trends} />
        </SectionCard>

        {/* $/sqft summary */}
        {(subject_price_per_sqft || median_comp_price_per_sqft) && (
          <SectionCard
            title="Price Per Square Foot"
            badge={<Text style={styles.sourceTag}>ATTOM Data</Text>}
            defaultOpen={false}
          >
            <View style={styles.psqftRow}>
              {subject_price_per_sqft != null && (
                <View style={styles.psqftTile}>
                  <Text style={styles.psqftLabel}>Subject $/sqft</Text>
                  <Text
                    style={[
                      styles.psqftValue,
                      {
                        color:
                          subject_price_per_sqft <= median_comp_price_per_sqft
                            ? colors.green
                            : subject_price_per_sqft <=
                              median_comp_price_per_sqft * 1.15
                            ? colors.yellow
                            : colors.red,
                      },
                    ]}
                  >
                    ${subject_price_per_sqft.toFixed(0)}
                  </Text>
                </View>
              )}
              {median_comp_price_per_sqft != null && (
                <View style={styles.psqftTile}>
                  <Text style={styles.psqftLabel}>Median Comp $/sqft</Text>
                  <Text style={styles.psqftValue}>
                    ${median_comp_price_per_sqft.toFixed(0)}
                  </Text>
                </View>
              )}
              {avg_comp_price_per_sqft != null && (
                <View style={styles.psqftTile}>
                  <Text style={styles.psqftLabel}>Avg Comp $/sqft</Text>
                  <Text style={styles.psqftValue}>
                    ${avg_comp_price_per_sqft.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>
          </SectionCard>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          HomeTrue — For informational purposes only. Not financial or legal
          advice.{"\n"}Data: ATTOM · Zillow · U.S. Census Bureau ACS · HUD
          FMR · FHFA HPI · OpenStreetMap
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: "auto",
    paddingRight: spacing.md,
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: typography.base,
    marginLeft: 4,
    fontWeight: "500",
  },
  logoSmall: {
    width: 24,
    height: 24,
    backgroundColor: colors.green,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  navTitle: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "900",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.green,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    color: "#0f1729",
    fontSize: typography.base,
    fontWeight: "700",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.yellowDim,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  disclaimerText: {
    color: "#fde68a",
    fontSize: typography.sm,
    flex: 1,
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.base,
    fontWeight: "700",
  },
  cardBadge: {
    flexShrink: 0,
  },
  cardBody: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  flagCountText: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  sourceTag: {
    color: colors.textMuted,
    fontSize: typography.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  psqftRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  psqftTile: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  psqftLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  psqftValue: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: "700",
    marginTop: 2,
  },
  footer: {
    color: colors.textDim,
    fontSize: typography.xs,
    textAlign: "center",
    lineHeight: 17,
    marginTop: spacing.xl,
  },
});
