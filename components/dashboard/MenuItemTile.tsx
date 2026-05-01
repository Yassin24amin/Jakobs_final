import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface MenuItemTileProps {
  name: string;
  price: number; // in cents
  isAvailable: boolean;
  cartQty?: number;
  onPress: () => void;
}

/**
 * Single tappable product tile in the POS menu grid.
 * Tap = add to cart instantly with haptic feedback.
 */
export function MenuItemTile({
  name,
  price,
  isAvailable,
  cartQty,
  onPress,
}: MenuItemTileProps) {
  const handlePress = () => {
    if (!isAvailable) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.tile, !isAvailable && styles.tileDisabled]}
      onPress={handlePress}
      activeOpacity={isAvailable ? 0.7 : 1}
      disabled={!isAvailable}
    >
      {cartQty !== undefined && cartQty > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartQty}</Text>
        </View>
      )}
      <Text style={[styles.name, !isAvailable && styles.nameDisabled]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.price, !isAvailable && styles.priceDisabled]}>
        ${(price / 100).toFixed(2)}
      </Text>
      {!isAvailable && <Text style={styles.unavailable}>Out of Stock</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    minHeight: 100,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tileDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: "#11181C",
    marginBottom: 4,
  },
  nameDisabled: {
    color: "#9CA3AF",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  priceDisabled: {
    color: "#9CA3AF",
  },
  unavailable: {
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 2,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
