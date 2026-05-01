import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { DashboardColors } from "@/constants/dashboard-theme";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface LowStockBannerProps {
  count: number;
  onPress: () => void;
}

/**
 * Alert banner displayed at top of inventory when items are below threshold.
 */
export function LowStockBanner({ count, onPress }: LowStockBannerProps) {
  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <IconSymbol
        name="exclamationmark.triangle.fill"
        size={20}
        color="#fff"
      />
      <Text style={styles.text}>
        {count} item{count !== 1 ? "s" : ""} low on stock
      </Text>
      <IconSymbol name="chevron.right" size={16} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DashboardColors.stock.critical,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 10,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
