import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { usePOSCart } from "@/contexts/pos-cart-context";
import { POSOrderLine } from "./pos-order-line";
import { POSActionBar } from "./pos-action-bar";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSLayout,
  POSSpacing,
} from "@/constants/pos-theme";

interface POSOrderPanelProps {
  onCash: () => void;
  onCard: () => void;
  isSumUpConfigured?: boolean;
}

export function POSOrderPanel({
  onCash,
  onCard,
  isSumUpConfigured,
}: POSOrderPanelProps) {
  const {
    items,
    total,
    itemCount,
    isEmpty,
    setQuantity,
    removeItem,
    clearCart,
  } = usePOSCart();

  return (
    <View style={styles.container}>
      {/* Panel header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CURRENT ORDER</Text>
        <Text style={styles.itemCount}>
          {itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}
        </Text>
      </View>

      {/* Order items list */}
      <ScrollView
        style={styles.itemsList}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>TAP ITEMS</Text>
            <Text style={styles.emptyText}>TO ADD</Text>
          </View>
        ) : (
          items.map((item) => (
            <POSOrderLine
              key={item.menuItemId}
              menuItemId={item.menuItemId}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              notes={item.notes}
              onIncrement={(id) =>
                setQuantity(id, item.quantity + 1)
              }
              onDecrement={(id) =>
                setQuantity(id, item.quantity - 1)
              }
              onRemove={removeItem}
            />
          ))
        )}
      </ScrollView>

      {/* Total */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalAmount}>
          {"\u20AC"}
          {(total / 100).toFixed(2)}
        </Text>
      </View>

      {/* Action bar */}
      <POSActionBar
        isEmpty={isEmpty}
        onCash={onCash}
        onCard={onCard}
        onClear={clearCart}
        isSumUpConfigured={isSumUpConfigured}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: POSLayout.orderPanelWidth,
    backgroundColor: POSColors.surface,
    borderLeftWidth: 1,
    borderLeftColor: POSColors.panelBorder,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: POSSpacing.panelPadding,
    paddingVertical: POSSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: POSColors.panelBorder,
  },
  headerTitle: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.sectionHeader,
    color: POSColors.primary,
    letterSpacing: 2,
    fontWeight: "700",
  },
  itemCount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 1,
  },
  itemsList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: POSSpacing.xxl * 2,
  },
  emptyText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.itemName,
    color: POSColors.faint,
    letterSpacing: 4,
    opacity: 0.4,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: POSSpacing.panelPadding,
    paddingVertical: POSSpacing.md,
    borderTopWidth: 2,
    borderTopColor: POSColors.accent,
  },
  totalLabel: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.primary,
    letterSpacing: 2,
  },
  totalAmount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.accent,
    fontWeight: "700",
  },
});
