import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { colors, spacing, radii, typography } from "../theme";

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchingZillow, setFetchingZillow] = useState(false);

  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [zestimate, setZestimate] = useState(null);

  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 4) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setFetching(true);
    try {
      const { data } = await client.get("/api/property/autocomplete", {
        params: { q },
      });
      setSuggestions(data || []);
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  async function prefillFromRentcast(addr) {
    if (!addr.address) return;
    setFetchingZillow(true);
    setZestimate(null);
    try {
      const { data } = await client.get("/api/property/prefill", {
        params: {
          address:  addr.address,
          city:     addr.city,
          state:    addr.state,
          zip_code: addr.zip_code,
        },
      });
      if (data.found) {
        if (data.avm_price)  setPrice(String(data.avm_price));
        if (data.bedrooms)   setBeds(String(data.bedrooms));
        if (data.bathrooms)  setBaths(String(data.bathrooms));
        if (data.sqft)       setSqft(String(data.sqft));
        if (data.assessed_value) setZestimate(data.assessed_value);
      }
    } catch {
      // silent
    } finally {
      setFetchingZillow(false);
    }
  }

  function handleChangeQuery(val) {
    setQuery(val);
    setSelected(null);
    setZestimate(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  function handleSelect(s) {
    setSelected(s);
    const parts = s.display_name.split(",").slice(0, 3).join(",");
    setQuery(parts);
    setShowDropdown(false);
    setSuggestions([]);
    Keyboard.dismiss();
    prefillFromRentcast(s);
  }

  function parseManualAddress(raw) {
    const zipMatch = raw.match(/\b(\d{5})\b/);
    const zip = zipMatch ? zipMatch[1] : "00000";
    const stateMatch =
      raw.match(/,?\s*([A-Z]{2})\s*\d{5}/) || raw.match(/,\s*([A-Z]{2})\s*$/);
    const state = stateMatch ? stateMatch[1] : "US";
    const street = raw.split(",")[0].trim();
    const parts = raw.split(",");
    const city = parts.length > 1 ? parts[1].trim() : "";
    return { address: street, city, state, zip_code: zip, lat: null, lon: null };
  }

  function handleSubmit() {
    if (!query.trim() || loading) return;
    const parsed = selected || parseManualAddress(query);
    Keyboard.dismiss();
    setShowDropdown(false);
    onSearch({
      address: parsed.address || query.trim(),
      city: parsed.city || "",
      state: parsed.state || "US",
      zip_code: parsed.zip_code || "00000",
      lat: parsed.lat || null,
      lon: parsed.lon || null,
      asking_price: price ? parseFloat(price.replace(/,/g, "")) : null,
      bedrooms: beds ? parseInt(beds, 10) : null,
      bathrooms: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft.replace(/,/g, ""), 10) : null,
    });
  }

  const isLoading = fetching || fetchingZillow;

  return (
    <View style={styles.container}>
      {/* Address Input */}
      <View style={styles.inputWrapper}>
        <View style={styles.inputRow}>
          <Ionicons
            name="location-outline"
            size={20}
            color={colors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.addressInput}
            value={query}
            onChangeText={handleChangeQuery}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Enter a property address or ZIP code..."
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
          />
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={colors.textSecondary}
              style={styles.inputSpinner}
            />
          )}
        </View>

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={suggestions}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="always"
              scrollEnabled={suggestions.length > 5}
              style={{ maxHeight: 240 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {item.address || item.display_name.split(",")[0]}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.city}, {item.state} {item.zip_code}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.suggestionDivider} />
              )}
            />
          </View>
        )}
      </View>

      {/* Zestimate preview */}
      {zestimate != null && (
        <View style={styles.zestimateBanner}>
          <Ionicons
            name="information-circle"
            size={16}
            color={colors.blue}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.zestimateText}>
            Assessed Value:{" "}
            <Text style={styles.zestimateValue}>
              ${zestimate.toLocaleString()}
            </Text>
            {"  "}
            <Text style={styles.zestimateSub}>— pre-filled from RentCast</Text>
          </Text>
        </View>
      )}

      {/* Detail Inputs */}
      <View style={styles.detailsGrid}>
        {[
          { label: "Asking Price ($)", val: price, set: setPrice, ph: "e.g. 350000", kbd: "numeric" },
          { label: "Bedrooms", val: beds, set: setBeds, ph: "e.g. 3", kbd: "numeric" },
          { label: "Bathrooms", val: baths, set: setBaths, ph: "e.g. 2", kbd: "decimal-pad" },
          { label: "Sq Ft", val: sqft, set: setSqft, ph: "e.g. 1800", kbd: "numeric" },
        ].map(({ label, val, set, ph, kbd }) => (
          <View key={label} style={styles.detailField}>
            <Text style={styles.detailLabel}>{label}</Text>
            <TextInput
              style={styles.detailInput}
              value={val}
              onChangeText={set}
              placeholder={ph}
              placeholderTextColor={colors.textDim}
              keyboardType={kbd}
              returnKeyType="done"
            />
          </View>
        ))}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!query.trim() || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!query.trim() || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#0f1729" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Analyzing...</Text>
          </>
        ) : (
          <>
            <Ionicons name="bar-chart" size={20} color="#0f1729" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Run Full Valuation</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  inputWrapper: {
    position: "relative",
    marginBottom: spacing.md,
    zIndex: 100,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  addressInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.base,
    padding: 0,
  },
  inputSpinner: {
    marginLeft: spacing.sm,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "#162033",
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: radii.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
    zIndex: 200,
  },
  suggestionItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  suggestionMain: {
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontWeight: "600",
  },
  suggestionSub: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    marginTop: 2,
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  zestimateBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blueDim,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  zestimateText: {
    color: "#bfdbfe",
    fontSize: typography.sm,
    flex: 1,
  },
  zestimateValue: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  zestimateSub: {
    color: colors.textSecondary,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailField: {
    width: "48%",
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    marginBottom: 4,
    fontWeight: "500",
  },
  detailInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: typography.sm,
  },
  submitButton: {
    backgroundColor: colors.green,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: "#0f1729",
    fontSize: typography.base,
    fontWeight: "700",
  },
});
