import React from "react";
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, typography } from "../theme";

function Tile({ label, value, sub, subColor }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.tileSub, subColor ? { color: subColor } : null]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export default function PropertySummary({
  property,
  estimated_annual_tax,
  tax_source,
  zestimate,
  zillow_url,
}) {
  const {
    address,
    city,
    state,
    zip_code,
    bedrooms,
    bathrooms,
    sqft,
    year_built,
    asking_price,
    days_on_market,
    price_reductions,
    total_price_reduction,
    tax_assessed_value,
    is_mock,
  } = property;

  const zestDiff =
    zestimate && asking_price ? asking_price - zestimate : null;
  const zestDiffPct =
    zestDiff != null && zestimate
      ? ((zestDiff / zestimate) * 100).toFixed(1)
      : null;

  const tiles = [
    {
      label: "Asking Price",
      value: asking_price ? `$${asking_price.toLocaleString()}` : "N/A",
      sub:
        zestimate != null && zestDiff != null
          ? zestDiff > 0
            ? `$${Math.abs(zestDiff).toLocaleString()} above Zest.`
            : zestDiff < 0
            ? `$${Math.abs(zestDiff).toLocaleString()} below Zest.`
            : "At Zestimate"
          : null,
      subColor:
        zestDiff != null
          ? zestDiff > 0
            ? colors.red
            : colors.green
          : null,
    },
    {
      label: "Zestimate",
      value: zestimate ? `$${zestimate.toLocaleString()}` : "N/A",
      sub:
        zestDiffPct != null
          ? zestDiff > 0
            ? `+${zestDiffPct}% over`
            : `${zestDiffPct}% under`
          : null,
      subColor:
        zestDiff != null
          ? zestDiff > 0
            ? colors.red
            : colors.green
          : null,
    },
    { label: "Beds", value: bedrooms ?? "—" },
    { label: "Baths", value: bathrooms ?? "—" },
    {
      label: "Sqft",
      value: sqft ? sqft.toLocaleString() : "—",
    },
    { label: "Year", value: year_built ?? "—" },
    { label: "DOM", value: days_on_market ?? "—" },
    {
      label: "Tax Assessed",
      value: tax_assessed_value
        ? `$${tax_assessed_value.toLocaleString()}`
        : "—",
      sub: tax_source || null,
    },
    {
      label: "Est. Annual Tax",
      value: estimated_annual_tax
        ? `$${estimated_annual_tax.toLocaleString()}`
        : "—",
      sub: "Census ACS",
    },
    {
      label: "Price Cuts",
      value:
        price_reductions > 0
          ? `${price_reductions} (-$${total_price_reduction?.toLocaleString()})`
          : "None",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.address} numberOfLines={2}>
            {address}
          </Text>
          <Text style={styles.cityState}>
            {city}, {state} {zip_code}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {is_mock && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Mock Data</Text>
            </View>
          )}
          {zillow_url ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(zillow_url)}
              style={styles.zillowLink}
            >
              <Text style={styles.zillowLinkText}>Zillow</Text>
              <Ionicons
                name="open-outline"
                size={12}
                color={colors.blue}
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tiles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tilesRow}
        style={styles.tilesScroll}
      >
        {tiles.map(({ label, value, sub, subColor }) => (
          <Tile
            key={label}
            label={label}
            value={String(value)}
            sub={sub}
            subColor={subColor}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  address: {
    color: colors.textPrimary,
    fontSize: typography.lg,
    fontWeight: "700",
    lineHeight: 22,
  },
  cityState: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  mockBadge: {
    backgroundColor: colors.yellowDim,
    borderWidth: 1,
    borderColor: colors.yellowBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  mockBadgeText: {
    color: colors.yellow,
    fontSize: typography.xs,
    fontWeight: "600",
  },
  zillowLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  zillowLinkText: {
    color: colors.blue,
    fontSize: typography.xs,
    textDecorationLine: "underline",
  },
  tilesScroll: {
    marginHorizontal: -spacing.xs,
  },
  tilesRow: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  tile: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 76,
    alignItems: "center",
  },
  tileLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: "center",
  },
  tileValue: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  tileSub: {
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
    color: colors.textMuted,
    lineHeight: 11,
  },
});
