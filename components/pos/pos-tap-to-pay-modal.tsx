import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { usePOSCart } from "@/contexts/pos-cart-context";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSOverlay,
  POSSpacing,
} from "@/constants/pos-theme";

type ModalStage =
  | "pairing"
  | "ready"
  | "sending"
  | "waiting"
  | "processing"
  | "success"
  | "failed";

interface POSTapToPayModalProps {
  visible: boolean;
  registerDeviceInstanceId: string | null;
  onClose: () => void;
  onComplete: (result: {
    orderNumber: string;
    paymentMethod: "stripe_tap_to_pay_iphone" | "stripe_tap_to_pay_android";
  }) => void;
  onSwitchToCash: () => void;
  onSwitchToCardTerminal: () => void;
}

function mapRequestStatusToStage(status?: string | null): ModalStage {
  switch (status) {
    case "reader_ready":
      return "ready";
    case "waiting_for_tap":
      return "waiting";
    case "processing":
      return "processing";
    case "succeeded":
      return "success";
    case "failed":
    case "canceled":
    case "expired":
      return "failed";
    case "created":
    case "claimed":
    default:
      return "sending";
  }
}

function getCompanionDescriptor(platform?: "iphone" | "android" | "ipad" | null) {
  if (platform === "android") {
    return {
      label: "ANDROID",
      paymentMethod: "stripe_tap_to_pay_android" as const,
    };
  }

  return {
    label: "IPHONE",
    paymentMethod: "stripe_tap_to_pay_iphone" as const,
  };
}

export function POSTapToPayModal({
  visible,
  registerDeviceInstanceId,
  onClose,
  onComplete,
  onSwitchToCash,
  onSwitchToCardTerminal,
}: POSTapToPayModalProps) {
  const { items, total, customerName, orderNotes } = usePOSCart();
  const pairDevice = useMutation(api.pos_devices.pairRegisterToCompanion);
  const createTapToPayRequest = useMutation(api.pos.createTapToPayRequest);
  const cancelTapToPayRequest = useMutation(api.pos.cancelTapToPayRequest);

  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] =
    useState<Id<"posPaymentRequests"> | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pairing = useQuery(
    api.pos_devices.getPairingForDevice,
    visible && registerDeviceInstanceId
      ? { deviceInstanceId: registerDeviceInstanceId }
      : "skip"
  );
  const availableCompanions = useQuery(
    api.pos_devices.listAvailableCompanions,
    visible ? {} : "skip"
  );
  const paymentRequest = useQuery(
    api.pos.getTapToPayRequest,
    paymentRequestId ? { paymentRequestId } : "skip"
  );

  useEffect(() => {
    if (!visible) {
      setSelectedCompanionId(null);
      setPaymentRequestId(null);
      setIsPairing(false);
      setIsStarting(false);
      setErrorMessage(null);
      return;
    }

    if (pairing?.pairedDevice?.deviceInstanceId) {
      setSelectedCompanionId(pairing.pairedDevice.deviceInstanceId);
      return;
    }

    if (availableCompanions && availableCompanions.length > 0) {
      setSelectedCompanionId(availableCompanions[0].deviceInstanceId);
    }
  }, [availableCompanions, pairing, visible]);

  useEffect(() => {
    if (!paymentRequest) return;

    if (paymentRequest.status === "succeeded") {
      const selectedPlatform =
        pairing?.pairedDevice?.platform ??
        availableCompanions?.find(
          (device) => device.deviceInstanceId === selectedCompanionId
        )?.platform ??
        null;
      const paymentMethod = getCompanionDescriptor(selectedPlatform).paymentMethod;
      onComplete({
        orderNumber: paymentRequest.createdOrderNumber ?? "---",
        paymentMethod,
      });
      return;
    }

    if (
      paymentRequest.status === "failed" ||
      paymentRequest.status === "canceled" ||
      paymentRequest.status === "expired"
    ) {
      setIsStarting(false);
      setErrorMessage(
        paymentRequest.failureMessage ??
          "Tap to Pay did not complete. Try again or use another payment method."
      );
    }
  }, [
    availableCompanions,
    onComplete,
    pairing?.pairedDevice?.platform,
    paymentRequest,
    selectedCompanionId,
  ]);

  useEffect(() => {
    if (!paymentRequestId) return;
    if (paymentRequest !== null) return;

    setPaymentRequestId(null);
    setIsStarting(false);
    setErrorMessage(null);
  }, [paymentRequest, paymentRequestId]);

  const hasOnlinePairing = Boolean(pairing?.pairedDevice && pairing?.pairedPresence?.isOnline);
  const hasActivePaymentRequest =
    paymentRequest !== undefined &&
    paymentRequest !== null &&
    paymentRequest.status !== "failed" &&
    paymentRequest.status !== "canceled" &&
    paymentRequest.status !== "expired" &&
    paymentRequest.status !== "succeeded";
  const stage = useMemo<ModalStage>(() => {
    if (paymentRequest) {
      return mapRequestStatusToStage(paymentRequest.status);
    }
    if (hasOnlinePairing) {
      return "ready";
    }
    return "pairing";
  }, [hasOnlinePairing, paymentRequest]);

  const handlePair = useCallback(async () => {
    if (!registerDeviceInstanceId || !selectedCompanionId) return;

    setIsPairing(true);
    setErrorMessage(null);
    try {
      await pairDevice({
        registerDeviceInstanceId,
        companionDeviceInstanceId: selectedCompanionId,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not pair Tap to Pay companion"
      );
    } finally {
      setIsPairing(false);
    }
  }, [pairDevice, registerDeviceInstanceId, selectedCompanionId]);

  const handleStart = useCallback(async () => {
    if (!registerDeviceInstanceId || !pairing?.pairedDevice?.deviceInstanceId) {
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const result = await createTapToPayRequest({
        registerDeviceInstanceId,
        companionDeviceInstanceId: pairing.pairedDevice.deviceInstanceId,
        customerName,
        notes: orderNotes || undefined,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });
      setPaymentRequestId(result.requestId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start Tap to Pay"
      );
      setIsStarting(false);
    }
  }, [
    createTapToPayRequest,
    customerName,
    items,
    orderNotes,
    pairing?.pairedDevice?.deviceInstanceId,
    registerDeviceInstanceId,
  ]);

  const handleCancel = useCallback(async () => {
    if (paymentRequestId && paymentRequest && paymentRequest.status !== "succeeded") {
      try {
        await cancelTapToPayRequest({
          paymentRequestId,
          reason: "Canceled from iPad POS",
        });
      } catch {
        // Best effort only.
      }
    }

    onClose();
  }, [cancelTapToPayRequest, onClose, paymentRequest, paymentRequestId]);

  const handleRetry = useCallback(() => {
    setPaymentRequestId(null);
    setErrorMessage(null);
    setIsStarting(false);
  }, []);

  const showPairingState = stage === "pairing" && !paymentRequestId;
  const selectedCompanion = availableCompanions?.find(
    (device) => device.deviceInstanceId === selectedCompanionId
  );
  const companionDescriptor = getCompanionDescriptor(
    pairing?.pairedDevice?.platform ?? selectedCompanion?.platform ?? null
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.kicker}>TAP TO PAY</Text>
          <Text style={styles.total}>
            {"\u20AC"}
            {(total / 100).toFixed(2)}
          </Text>

          {showPairingState ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PAIR A COMPANION PHONE</Text>
              <ScrollView style={styles.deviceList}>
                {availableCompanions === undefined ? (
                  <ActivityIndicator color={POSColors.accent} />
                ) : availableCompanions.length === 0 ? (
                  <Text style={styles.mutedText}>
                    No online companion phones found. Open the Tap to Pay companion
                    screen on the paired Android or iPhone first.
                  </Text>
                ) : (
                  availableCompanions.map((device) => {
                    const isSelected =
                      selectedCompanionId === device.deviceInstanceId;
                    return (
                      <Pressable
                        key={device._id}
                        style={[
                          styles.deviceRow,
                          isSelected && styles.deviceRowSelected,
                        ]}
                        onPress={() =>
                          setSelectedCompanionId(device.deviceInstanceId)
                        }
                      >
                        <View>
                          <Text style={styles.deviceName}>{device.name}</Text>
                          <Text style={styles.deviceMeta}>
                            {device.status.replace(/_/g, " ").toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.deviceStatus}>ONLINE</Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              <Pressable
                style={[
                  styles.primaryButton,
                  (!selectedCompanionId || isPairing) && styles.disabledButton,
                ]}
                disabled={!selectedCompanionId || isPairing}
                onPress={handlePair}
              >
                {isPairing ? (
                  <ActivityIndicator color={POSColors.black} />
                ) : (
                  <Text style={styles.primaryButtonText}>PAIR PHONE</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                PAIRED {companionDescriptor.label}
              </Text>
              <View style={styles.pairedCard}>
                <Text style={styles.deviceName}>
                  {pairing?.pairedDevice?.name ??
                    selectedCompanion?.name ??
                    `Tap to Pay ${companionDescriptor.label}`}
                </Text>
                <Text style={styles.deviceMeta}>
                  {pairing?.pairedPresence?.isOnline ? "ONLINE" : "OFFLINE"}
                </Text>
              </View>

              <View style={styles.statusBox}>
                {stage === "ready" && (
                  <Text style={styles.statusText}>
                    {paymentRequest
                      ? `Checkout is already active on the paired ${companionDescriptor.label.toLowerCase()}. Continue on that device or close this modal to cancel and retry.`
                      : `Ready to send checkout to the paired ${companionDescriptor.label.toLowerCase()}.`}
                  </Text>
                )}
                {stage === "sending" && (
                  <Text style={styles.statusText}>
                    Sending checkout to the paired {companionDescriptor.label.toLowerCase()}...
                  </Text>
                )}
                {stage === "waiting" && (
                  <Text style={styles.statusText}>
                    {companionDescriptor.label} is ready. Present the customer card on the {companionDescriptor.label.toLowerCase()}.
                  </Text>
                )}
                {stage === "processing" && (
                  <Text style={styles.statusText}>
                    Processing payment on the {companionDescriptor.label.toLowerCase()}...
                  </Text>
                )}
                {stage === "success" && (
                  <Text style={styles.successText}>PAYMENT RECEIVED</Text>
                )}
                {stage === "failed" && (
                  <Text style={styles.errorText}>
                    {errorMessage ?? "Tap to Pay failed."}
                  </Text>
                )}
              </View>

              {!hasActivePaymentRequest && (
                <Pressable
                  style={[
                    styles.primaryButton,
                    (!hasOnlinePairing || isStarting) && styles.disabledButton,
                  ]}
                  disabled={!hasOnlinePairing || isStarting}
                  onPress={handleStart}
                >
                  {isStarting ? (
                    <ActivityIndicator color={POSColors.black} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      START ON {companionDescriptor.label}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {errorMessage && stage !== "failed" && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          <View style={styles.footerActions}>
            {stage === "failed" && (
              <Pressable style={styles.secondaryButton} onPress={handleRetry}>
                <Text style={styles.secondaryButtonText}>RETRY</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                void handleCancel();
                onSwitchToCardTerminal();
              }}
            >
              <Text style={styles.secondaryButtonText}>CARD TERMINAL</Text>
            </Pressable>
            <Pressable
              style={styles.cashButton}
              onPress={() => {
                void handleCancel();
                onSwitchToCash();
              }}
            >
              <Text style={styles.cashButtonText}>USE CASH</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={() => void handleCancel()}>
              <Text style={styles.ghostButtonText}>CLOSE</Text>
            </Pressable>
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
    width: "58%",
    maxWidth: 560,
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.xl,
    gap: POSSpacing.lg,
  },
  kicker: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.accent,
    letterSpacing: 2,
    textAlign: "center",
  },
  total: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.receiptTotal,
    color: POSColors.primary,
    textAlign: "center",
    fontWeight: "700",
  },
  section: {
    gap: POSSpacing.md,
  },
  sectionTitle: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.sectionHeader,
    color: POSColors.faint,
    letterSpacing: 2,
  },
  deviceList: {
    maxHeight: 220,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    paddingHorizontal: POSSpacing.md,
    paddingVertical: POSSpacing.md,
    marginBottom: POSSpacing.sm,
  },
  deviceRowSelected: {
    borderColor: POSColors.accent,
    backgroundColor: POSColors.itemCardActive,
  },
  deviceName: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.primary,
    letterSpacing: 1,
  },
  deviceMeta: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    marginTop: POSSpacing.tight,
  },
  deviceStatus: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.successGreen,
    letterSpacing: 1,
  },
  pairedCard: {
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.md,
    gap: POSSpacing.tight,
  },
  statusBox: {
    minHeight: 78,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    paddingHorizontal: POSSpacing.md,
    paddingVertical: POSSpacing.lg,
  },
  statusText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    textAlign: "center",
  },
  mutedText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.faint,
    lineHeight: 22,
  },
  successText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.successGreen,
    letterSpacing: 2,
  },
  errorText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.dangerRed,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: POSColors.accent,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.black,
    letterSpacing: 2,
  },
  footerActions: {
    flexDirection: "row",
    gap: POSSpacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: POSColors.cardBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.cardBlue,
    letterSpacing: 1,
    textAlign: "center",
  },
  cashButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: POSColors.cashGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  cashButtonText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.black,
    letterSpacing: 1,
  },
  ghostButton: {
    minWidth: 84,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: POSColors.faint,
  },
  ghostButtonText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 1,
  },
  disabledButton: {
    opacity: 0.4,
  },
});
