import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import type { POSCartItem } from "@/contexts/pos-cart-context";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
  POSOverlay,
} from "@/constants/pos-theme";

interface POSReceiptViewProps {
  orderNumber: string;
  items: POSCartItem[];
  total: number;
  paymentMethod: "cash" | "sumup_terminal";
  cashTendered?: number;
  changeGiven?: number;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function POSReceiptView({
  orderNumber,
  items,
  total,
  paymentMethod,
  cashTendered,
  changeGiven,
  onDismiss,
  autoDismissMs = 5000,
}: POSReceiptViewProps) {
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-dismiss countdown
    const timer = setTimeout(onDismiss, autoDismissMs);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: autoDismissMs,
      useNativeDriver: false,
    }).start();

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss, progressAnim]);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.receipt} onPress={onDismiss}>
        {/* Success header */}
        <View style={styles.header}>
          <Text style={styles.checkmark}>{"\u2713"}</Text>
          <Text style={styles.headerTitle}>ORDER COMPLETE</Text>
        </View>

        {/* Order number */}
        <Text style={styles.orderNumber}>{orderNumber}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Items */}
        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>
                {"\u20AC"}
                {((item.price * item.quantity) / 100).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>
            {"\u20AC"}
            {(total / 100).toFixed(2)}
          </Text>
        </View>

        {/* Payment info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentLabel}>
            {paymentMethod === "cash" ? "CASH" : "CARD (SUMUP)"}
          </Text>
          {paymentMethod === "cash" && cashTendered !== undefined && (
            <>
              <Text style={styles.paymentDetail}>
                TENDERED: {"\u20AC"}
                {(cashTendered / 100).toFixed(2)}
              </Text>
              <Text style={styles.changeAmount}>
                CHANGE: {"\u20AC"}
                {((changeGiven ?? 0) / 100).toFixed(2)}
              </Text>
            </>
          )}
        </View>

        {/* Auto-dismiss progress */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        <Text style={styles.tapHint}>TAP ANYWHERE FOR NEXT ORDER</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: POSOverlay.modal,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  receipt: {
    width: "45%",
    maxWidth: 400,
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.lg,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: POSSpacing.md,
  },
  checkmark: {
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.successGreen,
    marginBottom: POSSpacing.sm,
  },
  headerTitle: {
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
    marginBottom: POSSpacing.md,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: POSColors.panelBorder,
    marginVertical: POSSpacing.sm,
  },
  itemsList: {
    width: "100%",
    gap: POSSpacing.tight,
    paddingVertical: POSSpacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
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
  paymentInfo: {
    width: "100%",
    alignItems: "center",
    gap: POSSpacing.tight,
    paddingVertical: POSSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: POSColors.panelBorder,
  },
  paymentLabel: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.sectionHeader,
    color: POSColors.faint,
    letterSpacing: 2,
  },
  paymentDetail: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
  },
  changeAmount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.cashGreen,
    fontWeight: "700",
  },
  progressContainer: {
    width: "100%",
    height: 3,
    backgroundColor: POSColors.panelBorder,
    marginTop: POSSpacing.lg,
  },
  progressBar: {
    height: "100%",
    backgroundColor: POSColors.accent,
  },
  tapHint: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 2,
    marginTop: POSSpacing.md,
    opacity: 0.5,
  },
});
