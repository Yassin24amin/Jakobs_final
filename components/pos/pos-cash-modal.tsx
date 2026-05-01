import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { POSNumpad } from "./pos-numpad";
import { usePOSCart } from "@/contexts/pos-cart-context";
import { useAuth } from "@/contexts/auth-context";
import { Id } from "@/convex/_generated/dataModel";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
  POSOverlay,
} from "@/constants/pos-theme";

interface POSCashModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000]; // cents

export function POSCashModal({
  visible,
  onClose,
  onComplete,
}: POSCashModalProps) {
  const { total, setCashTendered, changeDue, submitCashOrder, paymentState } =
    usePOSCart();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState("");

  // Convert input string to cents
  const inputCents = Math.round(parseFloat(inputValue || "0") * 100);
  const canComplete = inputCents >= total;

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      const cents = Math.round(parseFloat(value || "0") * 100);
      setCashTendered(cents);
    },
    [setCashTendered]
  );

  const handleQuickAmount = useCallback(
    (cents: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const euros = (cents / 100).toFixed(2);
      setInputValue(euros);
      setCashTendered(cents);
    },
    [setCashTendered]
  );

  const handleExact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const euros = (total / 100).toFixed(2);
    setInputValue(euros);
    setCashTendered(total);
  }, [total, setCashTendered]);

  const handleComplete = useCallback(async () => {
    if (!user || !canComplete) return;
    try {
      await submitCashOrder(user.id as Id<"users">);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } catch {
      // Error is handled by POSCartContext
    }
  }, [user, canComplete, submitCashOrder, onComplete]);

  const handleClose = useCallback(() => {
    setInputValue("");
    setCashTendered(0);
    onClose();
  }, [onClose, setCashTendered]);

  const isProcessing = paymentState === "processing_cash";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>CASH PAYMENT</Text>
            <Pressable onPress={handleClose} disabled={isProcessing}>
              <Text style={styles.closeButton}>{"\u2715"}</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Left: Info */}
            <View style={styles.infoPanel}>
              {/* Order total */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>ORDER TOTAL</Text>
                <Text style={styles.totalAmount}>
                  {"\u20AC"}
                  {(total / 100).toFixed(2)}
                </Text>
              </View>

              {/* Amount tendered */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>TENDERED</Text>
                <Text
                  style={[
                    styles.tenderedAmount,
                    canComplete && styles.tenderedValid,
                  ]}
                >
                  {"\u20AC"}
                  {inputValue || "0.00"}
                </Text>
              </View>

              {/* Change */}
              <View style={[styles.infoBlock, styles.changeBlock]}>
                <Text style={styles.infoLabel}>CHANGE DUE</Text>
                <Text
                  style={[
                    styles.changeAmount,
                    canComplete && styles.changeHighlight,
                  ]}
                >
                  {"\u20AC"}
                  {canComplete
                    ? ((inputCents - total) / 100).toFixed(2)
                    : "---"}
                </Text>
              </View>

              {/* Complete button */}
              <Pressable
                style={[
                  styles.completeButton,
                  !canComplete && styles.completeDisabled,
                ]}
                onPress={handleComplete}
                disabled={!canComplete || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={POSColors.black} size="small" />
                ) : (
                  <Text style={styles.completeText}>COMPLETE</Text>
                )}
              </Pressable>
            </View>

            {/* Right: Numpad */}
            <View style={styles.numpadPanel}>
              {/* Quick amounts */}
              <View style={styles.quickAmounts}>
                {QUICK_AMOUNTS.map((amount) => (
                  <Pressable
                    key={amount}
                    style={styles.quickButton}
                    onPress={() => handleQuickAmount(amount)}
                  >
                    <Text style={styles.quickText}>
                      {"\u20AC"}
                      {(amount / 100).toFixed(0)}
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.exactButton} onPress={handleExact}>
                  <Text style={styles.exactText}>EXACT</Text>
                </Pressable>
              </View>

              {/* Numpad */}
              <POSNumpad value={inputValue} onValueChange={handleInputChange} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: POSOverlay.modal,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "70%",
    maxWidth: 600,
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: POSSpacing.lg,
    paddingVertical: POSSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: POSColors.panelBorder,
  },
  headerTitle: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.primary,
    letterSpacing: 2,
  },
  closeButton: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.faint,
    padding: POSSpacing.sm,
  },
  body: {
    flexDirection: "row",
    padding: POSSpacing.lg,
    gap: POSSpacing.lg,
  },
  infoPanel: {
    flex: 1,
    justifyContent: "space-between",
    gap: POSSpacing.lg,
  },
  infoBlock: {
    gap: POSSpacing.tight,
  },
  changeBlock: {
    paddingTop: POSSpacing.md,
    borderTopWidth: 2,
    borderTopColor: POSColors.accent,
  },
  infoLabel: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 2,
  },
  totalAmount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.modalTotal,
    color: POSColors.primary,
    fontWeight: "700",
  },
  tenderedAmount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.faint,
    fontWeight: "700",
  },
  tenderedValid: {
    color: POSColors.cashGreen,
  },
  changeAmount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.modalTotal,
    color: POSColors.faint,
    fontWeight: "700",
  },
  changeHighlight: {
    color: POSColors.cashGreen,
  },
  completeButton: {
    backgroundColor: POSColors.cashGreen,
    paddingVertical: POSSpacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    marginTop: POSSpacing.md,
  },
  completeDisabled: {
    opacity: 0.3,
  },
  completeText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.black,
    fontWeight: "700",
    letterSpacing: 3,
  },
  numpadPanel: {
    flex: 1,
    gap: POSSpacing.md,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: POSSpacing.tight,
  },
  quickButton: {
    flex: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.panelBorder,
    borderWidth: 1,
    borderColor: POSColors.faint,
  },
  quickText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    fontWeight: "700",
  },
  exactButton: {
    flex: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.cashGreenDark,
  },
  exactText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.white,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
