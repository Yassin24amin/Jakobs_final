import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
  POSLayout,
} from "@/constants/pos-theme";
import { Id } from "@/convex/_generated/dataModel";

interface POSOrderLineProps {
  menuItemId: Id<"menuItems">;
  name: string;
  price: number; // cents
  quantity: number;
  notes?: string;
  onIncrement: (menuItemId: Id<"menuItems">) => void;
  onDecrement: (menuItemId: Id<"menuItems">) => void;
  onRemove: (menuItemId: Id<"menuItems">) => void;
  onEditNotes?: (menuItemId: Id<"menuItems">) => void;
}

export function POSOrderLine({
  menuItemId,
  name,
  price,
  quantity,
  notes,
  onIncrement,
  onDecrement,
  onRemove,
  onEditNotes,
}: POSOrderLineProps) {
  const lineTotal = price * quantity;

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onIncrement(menuItemId);
  };

  const handleDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (quantity <= 1) {
      onRemove(menuItemId);
    } else {
      onDecrement(menuItemId);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Quantity controls */}
        <View style={styles.qtyControls}>
          <Pressable
            style={styles.qtyButton}
            onPress={handleDecrement}
          >
            <Text style={styles.qtyButtonText}>-</Text>
          </Pressable>
          <Text style={styles.qtyText}>{quantity}</Text>
          <Pressable
            style={styles.qtyButton}
            onPress={handleIncrement}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>

        {/* Item name */}
        <Pressable
          style={styles.nameContainer}
          onPress={() => onEditNotes?.(menuItemId)}
        >
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {notes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {notes}
            </Text>
          ) : null}
        </Pressable>

        {/* Line total */}
        <Text style={styles.lineTotal}>
          {"\u20AC"}
          {(lineTotal / 100).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: POSColors.panelBorder,
    paddingVertical: POSSpacing.sm,
    paddingHorizontal: POSSpacing.panelPadding,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: POSSpacing.sm,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: POSSpacing.tight,
  },
  qtyButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.panelBorder,
    borderWidth: 1,
    borderColor: POSColors.faint,
  },
  qtyButtonText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    fontWeight: "700",
  },
  qtyText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    width: 24,
    textAlign: "center",
    fontWeight: "700",
  },
  nameContainer: {
    flex: 1,
    minHeight: POSLayout.touchTargetMin * 0.6,
    justifyContent: "center",
  },
  name: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    textTransform: "uppercase",
  },
  notes: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    fontStyle: "italic",
    marginTop: 1,
  },
  lineTotal: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.accent,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "right",
  },
});
