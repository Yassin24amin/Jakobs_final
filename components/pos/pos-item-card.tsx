import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSLayout,
  POSSpacing,
} from "@/constants/pos-theme";
import { Id } from "@/convex/_generated/dataModel";

interface POSItemCardProps {
  id: Id<"menuItems">;
  name: string;
  price: number; // cents
  isAvailable: boolean;
  isSpicy?: boolean;
  isSignature?: boolean;
  onPress: (id: Id<"menuItems">, name: string, price: number) => void;
}

export function POSItemCard({
  id,
  name,
  price,
  isAvailable,
  isSpicy,
  isSignature,
  onPress,
}: POSItemCardProps) {
  const flashAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (!isAvailable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Flash animation
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    onPress(id, name, price);
  };

  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [POSColors.itemCardBg, POSColors.accent],
  });

  const priceFormatted = `\u20AC${(price / 100).toFixed(2)}`;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isAvailable}
      style={styles.wrapper}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: bgColor },
          !isAvailable && styles.unavailable,
        ]}
      >
        <View style={styles.content}>
          <Text
            style={[styles.name, !isAvailable && styles.nameUnavailable]}
            numberOfLines={2}
          >
            {name}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={[styles.price, !isAvailable && styles.priceUnavailable]}>
              {priceFormatted}
            </Text>
            <View style={styles.indicators}>
              {isSpicy && <Text style={styles.indicator}>🌶</Text>}
              {isSignature && <Text style={styles.indicator}>★</Text>}
            </View>
          </View>
        </View>
        {!isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>86'd</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: POSLayout.cardMinHeight,
  },
  container: {
    flex: 1,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.sm,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.itemName,
    color: POSColors.primary,
    textTransform: "uppercase",
    lineHeight: 20,
  },
  nameUnavailable: {
    textDecorationLine: "line-through",
    color: POSColors.faint,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: POSSpacing.tight,
  },
  price: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.itemPrice,
    color: POSColors.accent,
  },
  priceUnavailable: {
    color: POSColors.faint,
  },
  indicators: {
    flexDirection: "row",
    gap: POSSpacing.tight,
  },
  indicator: {
    fontSize: POSFontSizes.label,
  },
  unavailable: {
    backgroundColor: POSColors.itemCardUnavailable,
    opacity: 0.5,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  unavailableText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.itemName,
    color: POSColors.dangerRed,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
