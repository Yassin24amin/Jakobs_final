import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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

type CardPaymentStage =
  | "initiating"
  | "waiting_for_tap"
  | "polling"
  | "success"
  | "failed"
  | "not_configured";

interface POSCardPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSwitchToCash: () => void;
}

const POLL_INTERVAL = 2000; // 2 seconds
const POLL_TIMEOUT = 90000; // 90 seconds

export function POSCardPaymentModal({
  visible,
  onClose,
  onComplete,
  onSwitchToCash,
}: POSCardPaymentModalProps) {
  const { total, submitCardOrder } = usePOSCart();
  const { user } = useAuth();
  const [stage, setStage] = useState<CardPaymentStage>("initiating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initiatePayment = useAction(api.sumup.initiatePayment);
  const checkStatus = useAction(api.sumup.checkPaymentStatus);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);
  const checkoutIdRef = useRef<string | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Start payment flow when modal becomes visible
  useEffect(() => {
    if (visible) {
      startPayment();
    } else {
      // Reset state when hidden
      setStage("initiating");
      setErrorMessage(null);
      checkoutIdRef.current = null;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const startPayment = useCallback(async () => {
    setStage("initiating");
    setErrorMessage(null);

    try {
      const result = await initiatePayment({
        amount: total,
        orderReference: `POS-${Date.now()}`,
      });
      checkoutIdRef.current = result.checkoutId;
      setStage("waiting_for_tap");
      pollStartRef.current = Date.now();
      startPolling();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initiate payment";

      if (
        message.includes("not configured") ||
        message.includes("not set")
      ) {
        setStage("not_configured");
      } else {
        setStage("failed");
      }
      setErrorMessage(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, initiatePayment]);

  const startPolling = useCallback(() => {
    const poll = async () => {
      if (!checkoutIdRef.current) return;

      // Check timeout
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        setStage("failed");
        setErrorMessage("Payment timed out. Please try again.");
        return;
      }

      try {
        const result = await checkStatus({
          checkoutId: checkoutIdRef.current,
        });

        if (result.status === "PAID" || result.status === "SUCCESSFUL") {
          // Submit the order before showing success
          if (user) {
            try {
              await submitCardOrder(
                user.id as Id<"users">,
                result.transactionId ?? checkoutIdRef.current
              );
              setStage("success");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTimeout(onComplete, 800);
            } catch {
              setStage("failed");
              setErrorMessage("Payment received but order creation failed.");
            }
          } else {
            setStage("failed");
            setErrorMessage(
              "Payment received but no user session. Please contact staff."
            );
          }
          return;
        }

        if (result.status === "FAILED" || result.status === "EXPIRED") {
          setStage("failed");
          setErrorMessage("Payment was declined or expired.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        // Still pending — poll again
        setStage("polling");
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
      } catch {
        // Network error — keep polling
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
      }
    };

    pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
  }, [checkStatus, submitCardOrder, user, onComplete]);

  const handleRetry = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    startPayment();
  }, [startPayment]);

  const handleCancel = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Total */}
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>
            {"\u20AC"}
            {(total / 100).toFixed(2)}
          </Text>

          {/* Stage-specific content */}
          {(stage === "initiating" || stage === "waiting_for_tap" || stage === "polling") && (
            <View style={styles.waitingContainer}>
              <ActivityIndicator
                color={POSColors.cardBlue}
                size="large"
                style={styles.spinner}
              />
              <Text style={styles.instruction}>
                {stage === "initiating"
                  ? "CONNECTING TO TERMINAL..."
                  : "PRESENT CARD ON TERMINAL"}
              </Text>
              <Pressable style={styles.cancelLink} onPress={handleCancel}>
                <Text style={styles.cancelLinkText}>CANCEL</Text>
              </Pressable>
            </View>
          )}

          {stage === "success" && (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>{"\u2713"}</Text>
              <Text style={styles.successText}>PAYMENT RECEIVED</Text>
            </View>
          )}

          {stage === "failed" && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>{"\u2717"}</Text>
              <Text style={styles.errorText}>
                {errorMessage ?? "Payment failed"}
              </Text>
              <View style={styles.errorActions}>
                <Pressable style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryText}>RETRY</Text>
                </Pressable>
                <Pressable
                  style={styles.switchButton}
                  onPress={() => {
                    handleCancel();
                    onSwitchToCash();
                  }}
                >
                  <Text style={styles.switchText}>USE CASH</Text>
                </Pressable>
              </View>
            </View>
          )}

          {stage === "not_configured" && (
            <View style={styles.errorContainer}>
              <Text style={styles.notConfiguredText}>
                CARD TERMINAL NOT CONFIGURED
              </Text>
              <Text style={styles.notConfiguredSubtext}>
                Set SUMUP_API_KEY and SUMUP_READER_ID in Convex dashboard
              </Text>
              <View style={styles.errorActions}>
                <Pressable
                  style={styles.switchButton}
                  onPress={() => {
                    handleCancel();
                    onSwitchToCash();
                  }}
                >
                  <Text style={styles.switchText}>USE CASH INSTEAD</Text>
                </Pressable>
                <Pressable style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>CLOSE</Text>
                </Pressable>
              </View>
            </View>
          )}
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
    width: "50%",
    maxWidth: 440,
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    alignItems: "center",
    paddingVertical: POSSpacing.xl,
    paddingHorizontal: POSSpacing.lg,
  },
  totalLabel: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 3,
  },
  totalAmount: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.primary,
    fontWeight: "700",
    marginBottom: POSSpacing.xl,
  },
  waitingContainer: {
    alignItems: "center",
    gap: POSSpacing.lg,
  },
  spinner: {
    marginBottom: POSSpacing.sm,
  },
  instruction: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.cardBlue,
    letterSpacing: 2,
    textAlign: "center",
  },
  cancelLink: {
    marginTop: POSSpacing.md,
    padding: POSSpacing.sm,
  },
  cancelLinkText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 1,
  },
  successContainer: {
    alignItems: "center",
    gap: POSSpacing.md,
  },
  successIcon: {
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.successGreen,
  },
  successText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.successGreen,
    letterSpacing: 2,
  },
  errorContainer: {
    alignItems: "center",
    gap: POSSpacing.md,
  },
  errorIcon: {
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.dangerRed,
  },
  errorText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.dangerRed,
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: POSSpacing.md,
    marginTop: POSSpacing.md,
  },
  retryButton: {
    flex: 1,
    backgroundColor: POSColors.cardBlue,
    paddingVertical: POSSpacing.md,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  retryText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.white,
    fontWeight: "700",
    letterSpacing: 1,
  },
  switchButton: {
    flex: 1,
    backgroundColor: POSColors.cashGreen,
    paddingVertical: POSSpacing.md,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  switchText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.black,
    fontWeight: "700",
    letterSpacing: 1,
  },
  notConfiguredText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.warningAmber,
    letterSpacing: 1,
    textAlign: "center",
  },
  notConfiguredSubtext: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    textAlign: "center",
    lineHeight: 16,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: POSColors.faint,
    paddingVertical: POSSpacing.md,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.faint,
    letterSpacing: 1,
  },
});
