import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { colors, spacing, radii, typography } from "../theme";

function fmt(n) {
  return n ? `$${Number(n).toLocaleString()}` : "—";
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function psqftColor(psqft, subjectPsqft) {
  if (!subjectPsqft || !psqft) return colors.textSecondary;
  const diff = ((psqft - subjectPsqft) / subjectPsqft) * 100;
  if (diff < -5) return colors.green;
  if (diff > 15) return colors.red;
  return colors.yellow;
}

function CompCard({ comp, subject_price_per_sqft }) {
  const isSubject = comp.is_subject;
  return (
    <View
      style={[
        styles.compCard,
        isSubject && styles.compCardSubject,
      ]}
    >
      <View style={styles.compHeader}>
        {isSubject && (
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectBadgeText}>Subject</Text>
          </View>
        )}
        <Text
          style={[styles.compAddress, isSubject && styles.compAddressSubject]}
          numberOfLines={2}
        >
          {comp.address}
        </Text>
      </View>

      <View style={styles.compDetails}>
        <View style={styles.compStat}>
          <Text style={styles.compStatLabel}>Sold Price</Text>
          <Text style={styles.compStatValue}>{fmt(comp.sold_price)}</Text>
        </View>
        <View style={styles.compStat}>
          <Text style={styles.compStatLabel}>$/sqft</Text>
          <Text
            style={[
              styles.compStatValue,
              { color: psqftColor(comp.price_per_sqft, subject_price_per_sqft) },
            ]}
          >
            {comp.price_per_sqft ? `$${comp.price_per_sqft.toFixed(0)}` : "—"}
          </Text>
        </View>
        <View style={styles.compStat}>
          <Text style={styles.compStatLabel}>Sqft</Text>
          <Text style={styles.compStatValue}>
            {comp.sqft ? comp.sqft.toLocaleString() : "—"}
          </Text>
        </View>
        <View style={styles.compStat}>
          <Text style={styles.compStatLabel}>Beds/Baths</Text>
          <Text style={styles.compStatValue}>
            {comp.bedrooms}bd / {comp.bathrooms}ba
          </Text>
        </View>
        <View style={styles.compStat}>
          <Text style={styles.compStatLabel}>Sold Date</Text>
          <Text style={styles.compStatValue}>{fmtDate(comp.sold_date)}</Text>
        </View>
        {comp.distance_miles != null && (
          <View style={styles.compStat}>
            <Text style={styles.compStatLabel}>Distance</Text>
            <Text style={styles.compStatValue}>{comp.distance_miles} mi</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CompsSection({
  comps,
  subject_price_per_sqft,
  median_comp_price_per_sqft,
}) {
  const [sortKey, setSortKey] = useState("sold_date");
  const [sortDir, setSortDir] = useState("desc");

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...comps].sort((a, b) => {
    let av = a[sortKey] ?? 0;
    let bv = b[sortKey] ?? 0;
    if (typeof av === "string") {
      av = av.toLowerCase();
      bv = (bv || "").toLowerCase();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const sortOptions = [
    { key: "sold_date", label: "Date" },
    { key: "sold_price", label: "Price" },
    { key: "price_per_sqft", label: "$/sqft" },
    { key: "distance_miles", label: "Distance" },
  ];

  return (
    <View style={styles.container}>
      {/* Sort controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortRow}
        style={styles.sortScroll}
      >
        {sortOptions.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.sortButton,
              sortKey === key && styles.sortButtonActive,
            ]}
            onPress={() => toggleSort(key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortKey === key && styles.sortButtonTextActive,
              ]}
            >
              {label} {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Comp cards */}
      {sorted.map((comp, i) => (
        <CompCard
          key={i}
          comp={comp}
          subject_price_per_sqft={subject_price_per_sqft}
        />
      ))}

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryLabel}>Median $/sqft</Text>
          <Text style={styles.summaryValue}>
            {median_comp_price_per_sqft
              ? `$${median_comp_price_per_sqft.toFixed(0)}`
              : "—"}
          </Text>
        </View>
        {subject_price_per_sqft != null && (
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Subject $/sqft</Text>
            <Text
              style={[
                styles.summaryValue,
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sortScroll: {
    marginBottom: spacing.xs,
  },
  sortRow: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.greenDim,
    borderColor: colors.greenBorder,
  },
  sortButtonText: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    fontWeight: "600",
  },
  sortButtonTextActive: {
    color: colors.green,
  },
  compCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  compCardSubject: {
    backgroundColor: colors.greenDim,
    borderColor: colors.greenBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  compHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  subjectBadge: {
    backgroundColor: colors.green,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  subjectBadgeText: {
    color: "#0f1729",
    fontSize: 10,
    fontWeight: "700",
  },
  compAddress: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.sm,
    lineHeight: 18,
  },
  compAddressSubject: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  compDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  compStat: {
    minWidth: 80,
  },
  compStatLabel: {
    color: colors.textMuted,
    fontSize: typography.xs,
    marginBottom: 2,
  },
  compStatValue: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
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
