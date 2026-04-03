import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, typography } from "../theme";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function SeverityDot({ severity }) {
  const dotColors = {
    high: colors.red,
    medium: "#f97316",
    low: colors.yellow,
  };
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: dotColors[severity] || colors.textSecondary },
      ]}
    />
  );
}

function FlagItem({ flag, isRed }) {
  return (
    <View
      style={[
        styles.flagItem,
        isRed ? styles.flagItemRed : styles.flagItemGreen,
      ]}
    >
      {isRed ? (
        <SeverityDot severity={flag.severity} />
      ) : (
        <View style={[styles.dot, { backgroundColor: colors.green }]} />
      )}
      <Text
        style={[styles.flagText, isRed ? styles.flagTextRed : styles.flagTextGreen]}
      >
        {flag.message}
      </Text>
    </View>
  );
}

export default function FlagsSection({ flags }) {
  if (!flags?.length) {
    return (
      <Text style={styles.emptyText}>No flags detected.</Text>
    );
  }

  const red = flags
    .filter((f) => f.type === "red")
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
    );

  const green = flags
    .filter((f) => f.type === "green")
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
    );

  const yellow = flags.filter((f) => f.type === "yellow");

  return (
    <View style={styles.container}>
      {red.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={16} color={colors.red} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitleRed}>
              {red.length} Red Flag{red.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {red.map((f, i) => (
            <FlagItem key={i} flag={f} isRed={true} />
          ))}
        </View>
      )}

      {yellow.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={16} color={colors.yellow} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitleYellow}>
              {yellow.length} Warning{yellow.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {yellow.map((f, i) => (
            <View key={i} style={[styles.flagItem, styles.flagItemYellow]}>
              <View style={[styles.dot, { backgroundColor: colors.yellow }]} />
              <Text style={[styles.flagText, styles.flagTextYellow]}>
                {f.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {green.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.green}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.sectionTitleGreen}>
              {green.length} Green Flag{green.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {green.map((f, i) => (
            <FlagItem key={i} flag={f} isRed={false} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitleRed: {
    color: colors.red,
    fontSize: typography.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionTitleGreen: {
    color: colors.green,
    fontSize: typography.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionTitleYellow: {
    color: colors.yellow,
    fontSize: typography.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  flagItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
  },
  flagItemRed: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: colors.redBorder,
  },
  flagItemGreen: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: colors.greenBorder,
  },
  flagItemYellow: {
    backgroundColor: "rgba(234,179,8,0.08)",
    borderColor: colors.yellowBorder,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    marginTop: 4,
    flexShrink: 0,
  },
  flagText: {
    flex: 1,
    fontSize: typography.sm,
    lineHeight: 19,
  },
  flagTextRed: {
    color: "#fca5a5",
  },
  flagTextGreen: {
    color: "#86efac",
  },
  flagTextYellow: {
    color: "#fde68a",
  },
});
