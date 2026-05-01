import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
  POSOverlay,
} from "@/constants/pos-theme";

export default function POSReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const order = useQuery(api.orders.get, {
    id: id as Id<"orders">,
  });
  const orderItems = useQuery(
    api.orders.getOrderItems,
    order ? { orderId: order._id } : "skip"
  );

  if (order === undefined || orderItems === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={POSColors.accent} size="large" />
      </View>
    );
  }

  if (order === null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.notFoundText}>ORDER NOT FOUND</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>BACK TO POS</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.receipt}>
        {/* Header */}
        <Text style={styles.checkmark}>{"\u2713"}</Text>
        <Text style={styles.title}>ORDER COMPLETE</Text>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Items */}
        {orderItems.map((item: Doc<"orderItems">) => (
          <View key={item._id} style={styles.itemRow}>
            <Text style={styles.itemQty}>{item.quantity}x</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>
              {"\u20AC"}
              {((item.price * item.quantity) / 100).toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>
            {"\u20AC"}
            {(order.total / 100).toFixed(2)}
          </Text>
        </View>

        {/* Payment */}
        <Text style={styles.paymentMethod}>
          {order.paymentMethod === "cash"
            ? "CASH"
            : order.paymentMethod === "sumup_terminal"
              ? "CARD (SUMUP)"
              : "CARD"}
        </Text>
        {order.cashTendered != null && (
          <>
            <Text style={styles.detail}>
              TENDERED: {"\u20AC"}
              {(order.cashTendered / 100).toFixed(2)}
            </Text>
            <Text style={styles.change}>
              CHANGE: {"\u20AC"}
              {((order.changeGiven ?? 0) / 100).toFixed(2)}
            </Text>
          </>
        )}

        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>BACK TO POS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.background,
  },
  notFoundText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.primary,
    letterSpacing: 2,
    marginBottom: POSSpacing.lg,
  },
  container: {
    flex: 1,
    backgroundColor: POSOverlay.modal,
    justifyContent: "center",
    alignItems: "center",
  },
  receipt: {
    width: 380,
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.lg,
    alignItems: "center",
  },
  checkmark: {
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.successGreen,
    marginBottom: POSSpacing.sm,
  },
  title: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.successGreen,
    letterSpacing: 3,
  },
  orderNumber: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.accent,
    fontWeight: "700",
    letterSpacing: 2,
    marginVertical: POSSpacing.md,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: POSColors.panelBorder,
    marginVertical: POSSpacing.sm,
  },
  itemRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: POSSpacing.tight,
  },
  itemQty: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.faint,
    width: 32,
  },
  itemName: {
    flex: 1,
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    textTransform: "uppercase",
  },
  itemPrice: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    minWidth: 60,
    textAlign: "right",
  },
  totalRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: POSSpacing.md,
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
  paymentMethod: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.sectionHeader,
    color: POSColors.faint,
    letterSpacing: 2,
    marginTop: POSSpacing.sm,
  },
  detail: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    marginTop: POSSpacing.tight,
  },
  change: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.cashGreen,
    fontWeight: "700",
    marginTop: POSSpacing.tight,
  },
  backButton: {
    marginTop: POSSpacing.xl,
    paddingVertical: POSSpacing.md,
    paddingHorizontal: POSSpacing.xl,
    backgroundColor: POSColors.accent,
  },
  backText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.black,
    letterSpacing: 2,
  },
});
