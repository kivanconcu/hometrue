import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import SearchBar from "../components/SearchBar";
import { colors, spacing, radii, typography } from "../theme";

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(searchData) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/api/analyze", searchData);
      navigation.navigate("Results", { result: data });
    } catch (e) {
      setError(
        e.message ||
          "Failed to analyze property. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoIcon}>
              <Ionicons name="home" size={20} color="#0f1729" />
            </View>
            <Text style={styles.logoText}>HomeTrue</Text>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroHeading}>
              Is This Home{" "}
              <Text style={styles.heroHeadingAccent}>Worth It?</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Enter any U.S. home address to get a comprehensive valuation
              report — comps, overvaluation score, price projections, and
              red flags.
            </Text>
          </View>

          {/* Search form */}
          <View style={styles.formContainer}>
            <SearchBar onSearch={handleSearch} loading={loading} />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.red}
                style={{ marginRight: 8, flexShrink: 0 }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <Text style={styles.footer}>
            HomeTrue — For informational purposes only. Not financial or legal
            advice.{"\n"}Data: ATTOM · Zillow · U.S. Census Bureau ACS · HUD
            FMR · FHFA HPI
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: typography.xxl,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  hero: {
    marginBottom: spacing.xxxl,
  },
  heroHeading: {
    color: colors.textPrimary,
    fontSize: typography.xxxl,
    fontWeight: "900",
    lineHeight: 38,
    marginBottom: spacing.md,
  },
  heroHeadingAccent: {
    color: colors.green,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.base,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: spacing.xl,
    zIndex: 100,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.redDim,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: typography.sm,
    flex: 1,
    lineHeight: 19,
  },
  footer: {
    color: colors.textDim,
    fontSize: typography.xs,
    textAlign: "center",
    lineHeight: 17,
    marginTop: spacing.xxxl,
  },
});
