import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface ReorderAlertBannerProps {
  orderedCount: number;
  suggestedCount: number;
  onPress: () => void;
}

/**
 * Alert banner for pending reorders — shown on the Stock tab.
 * Highlights auto-ordered (urgent/critical) reorders prominently.
 */
export function ReorderAlertBanner({
  orderedCount,
  suggestedCount,
  onPress,
}: ReorderAlertBannerProps) {
  if (orderedCount === 0 && suggestedCount === 0) return null;

  const hasUrgent = orderedCount > 0;

  return (
    <TouchableOpacity
      style={[styles.container, hasUrgent ? styles.urgent : styles.info]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <IconSymbol name="bell.fill" size={20} color="#fff" />
      <View style={styles.textWrap}>
        {hasUrgent && (
          <Text style={styles.text}>
            {orderedCount} auto-ordered reorder{orderedCount !== 1 ? "s" : ""} awaiting delivery
          </Text>
        )}
        {suggestedCount > 0 && (
          <Text style={[styles.text, hasUrgent && styles.subText]}>
            {suggestedCount} suggested reorder{suggestedCount !== 1 ? "s" : ""} to review
          </Text>
        )}
      </View>
      <IconSymbol name="chevron.right" size={16} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 10,
  },
  urgent: { backgroundColor: "#DC2626" },
  info: { backgroundColor: "#2563EB" },
  textWrap: { flex: 1 },
  text: { color: "#fff", fontSize: 15, fontWeight: "600" },
  subText: { fontSize: 13, fontWeight: "500", opacity: 0.85, marginTop: 2 },
});
