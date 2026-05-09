import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PermissionsAndroid,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  StripeTerminalProvider,
  useStripeTerminal,
  type Reader,
} from "@stripe/stripe-terminal-react-native";
import { api } from "@/convex/_generated/api";
import { usePOSDeviceIdentity } from "@/hooks/use-pos-device";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
} from "@/constants/pos-theme";

const HEARTBEAT_INTERVAL_MS = 10_000;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Tap to Pay error";
}

async function ensureAndroidTapToPayPermissions() {
  const permissions = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];

  if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
    permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  }
  if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
    permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);

  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
  );
}

function TapToPayCompanionContent({
  deviceInstanceId,
  deviceName,
  platform,
}: {
  deviceInstanceId: string;
  deviceName: string;
  platform: "iphone" | "android";
}) {
  const router = useRouter();
  const setPresence = useMutation(api.pos_devices.setPresence);
  const claimTapToPayRequest = useMutation(api.pos.claimTapToPayRequest);
  const updateTapToPayRequestStatus = useMutation(api.pos.updateTapToPayRequestStatus);
  const finalizeTapToPayOrder = useMutation(api.pos.finalizeTapToPayOrder);
  const createTapToPayPaymentIntent = useAction(
    api.terminal.createTapToPayPaymentIntent
  );
  const cancelTapToPayPaymentIntent = useAction(
    api.terminal.cancelTapToPayPaymentIntent
  );

  const pairing = useQuery(api.pos_devices.getPairingForDevice, {
    deviceInstanceId,
  });
  const activeRequest = useQuery(api.pos.getTapToPayRequestForCompanion, {
    companionDeviceInstanceId: deviceInstanceId,
  });

  const stripeTerminalLocationId =
    process.env.EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID;
  const merchantDisplayName =
    process.env.EXPO_PUBLIC_STRIPE_TERMINAL_MERCHANT_DISPLAY_NAME ?? "Jakob's";
  const isConfigured = Boolean(stripeTerminalLocationId);

  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<Reader.ConnectionStatus>("notConnected");
  const [paymentStatus, setPaymentStatus] = useState("notReady");
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnectingReader, setIsConnectingReader] = useState(false);
  const [isDeviceEligible, setIsDeviceEligible] = useState<boolean | null>(null);

  const currentRequestIdRef = useRef<string | null>(null);
  const useSimulatedTapToPay =
    platform === "android" &&
    (__DEV__ ||
      process.env.EXPO_PUBLIC_STRIPE_TERMINAL_ANDROID_SIMULATED === "true");

  const {
    connectedReader,
    initialize,
    easyConnect,
    supportsReadersOfType,
    retrievePaymentIntent,
    collectPaymentMethod,
    processPaymentIntent,
    cancelCollectPaymentMethod,
    cancelProcessPaymentIntent,
  } = useStripeTerminal({
    onDidChangeConnectionStatus: setConnectionStatus,
    onDidChangePaymentStatus: setPaymentStatus,
    onDidDisconnect: () => {
      setLastOutcome("Reader disconnected. Reconnecting...");
    },
    onDidAcceptTermsOfService: () => {
      setLastOutcome(
        `Tap to Pay terms accepted on this ${platform === "android" ? "Android device" : "iPhone"}.`
      );
    },
  });

  useEffect(() => {
    let isMounted = true;

    const bootstrapTerminal = async () => {
      if (!isConfigured) {
        setIsInitializing(false);
        return;
      }

      const result = await initialize();
      if (!isMounted) return;

      if (result.error) {
        setTerminalError(result.error.message);
      }

      if (platform === "android") {
        const supportResult = await supportsReadersOfType({
          discoveryMethod: "tapToPay",
          deviceType: "tapToPay",
          simulated: useSimulatedTapToPay,
        });

        if (!isMounted) return;

        if (supportResult.error) {
          setIsDeviceEligible(false);
          setTerminalError(supportResult.error.message);
        } else {
          setIsDeviceEligible(supportResult.readerSupportResult);
          if (!supportResult.readerSupportResult) {
            setTerminalError(
              useSimulatedTapToPay
                ? "This Android device cannot run Stripe's simulated Tap to Pay reader."
                : "This Android device is not eligible for Tap to Pay. Check NFC, Android 13+, Play Store/GMS, recent security patch, locked bootloader, and that Developer options are disabled."
            );
          }
        }
      }

      setIsInitializing(false);
    };

    bootstrapTerminal().catch((error) => {
      if (isMounted) {
        setTerminalError(getErrorMessage(error));
        setIsInitializing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialize, isConfigured, platform, supportsReadersOfType, useSimulatedTapToPay]);

  useEffect(() => {
    if (
      !isConfigured ||
      isInitializing ||
      connectedReader ||
      isConnectingReader ||
      isDeviceEligible === false
    ) {
      return;
    }

    let isMounted = true;

    const connectTapToPayReader = async () => {
      setIsConnectingReader(true);
      setTerminalError(null);

      if (platform === "android") {
        setLastOutcome("Requesting Android Tap to Pay permissions...");
        const granted = await ensureAndroidTapToPayPermissions();
        if (!isMounted) return;

        if (!granted) {
          setTerminalError(
            "Location and nearby device permissions are required before starting Tap to Pay on Android."
          );
          setLastOutcome(
            "Tap to Pay cannot start until Android location and nearby device permissions are granted."
          );
          setIsConnectingReader(false);
          return;
        }
      }

      const connectResult = await easyConnect({
        discoveryMethod: "tapToPay",
        simulated: useSimulatedTapToPay,
        locationId: stripeTerminalLocationId!,
        merchantDisplayName,
        autoReconnectOnUnexpectedDisconnect: true,
        tosAcceptancePermitted: true,
      });

      if (!isMounted) return;
      if (connectResult.error) {
        setTerminalError(connectResult.error.message);
      } else {
        setTerminalError(null);
        if (useSimulatedTapToPay) {
          setLastOutcome(
            "Android Tap to Pay is running in simulated mode because this is a debug/dev build."
          );
        }
      }
      setIsConnectingReader(false);
    };

    void connectTapToPayReader();

    return () => {
      isMounted = false;
    };
  }, [
    connectedReader,
    easyConnect,
    isConfigured,
    isDeviceEligible,
    isConnectingReader,
    isInitializing,
    merchantDisplayName,
    platform,
    stripeTerminalLocationId,
    useSimulatedTapToPay,
  ]);

  const presenceStatus = useMemo(() => {
    if (!isConfigured || isInitializing || isConnectingReader) {
      return "reconnecting" as const;
    }
    if (currentRequestIdRef.current || activeRequest) {
      return "busy" as const;
    }
    if (connectedReader) {
      return "companion_ready" as const;
    }
    return "reconnecting" as const;
  }, [activeRequest, connectedReader, isConfigured, isConnectingReader, isInitializing]);

  useEffect(() => {
    const heartbeat = () => {
      setPresence({
        deviceInstanceId,
        status: presenceStatus,
        currentPaymentRequestId: activeRequest?._id,
      }).catch(console.error);
    };

    heartbeat();
    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      setPresence({
        deviceInstanceId,
        status: "offline",
      }).catch(() => undefined);
    };
  }, [activeRequest?._id, deviceInstanceId, presenceStatus, setPresence]);

  useEffect(() => {
    if (activeRequest?.status !== "canceled") return;
    if (currentRequestIdRef.current !== activeRequest._id) return;

    cancelCollectPaymentMethod().catch(() => undefined);
    cancelProcessPaymentIntent().catch(() => undefined);
    currentRequestIdRef.current = null;
    setLastOutcome("Checkout canceled from the iPad.");
  }, [activeRequest, cancelCollectPaymentMethod, cancelProcessPaymentIntent]);

  useEffect(() => {
    if (!activeRequest || !connectedReader || !isConfigured) return;
    if (currentRequestIdRef.current === activeRequest._id) return;
    if (
      activeRequest.status === "failed" ||
      activeRequest.status === "canceled" ||
      activeRequest.status === "succeeded" ||
      activeRequest.status === "expired" ||
      activeRequest.status === "waiting_for_tap" ||
      activeRequest.status === "processing"
    ) {
      return;
    }

    const requestId = activeRequest._id;
    currentRequestIdRef.current = requestId;

    const processRequest = async () => {
      let paymentIntentId: string | null = null;

      try {
        setLastOutcome("Claiming checkout on this phone...");
        await claimTapToPayRequest({
          paymentRequestId: requestId,
          companionDeviceInstanceId: deviceInstanceId,
        });

        setLastOutcome("Reader connected. Preparing payment...");
        await updateTapToPayRequestStatus({
          paymentRequestId: requestId,
          status: "reader_ready",
        });

        setLastOutcome("Creating Stripe PaymentIntent...");
        const paymentIntent = await createTapToPayPaymentIntent({
          paymentRequestId: requestId,
        });
        paymentIntentId = paymentIntent.paymentIntentId;

        if (currentRequestIdRef.current !== requestId) return;

        setLastOutcome("Loading payment on the reader...");
        const retrieved = await retrievePaymentIntent(paymentIntent.clientSecret);
        if (retrieved.error || !retrieved.paymentIntent) {
          throw new Error(retrieved.error?.message ?? "Failed to retrieve PaymentIntent");
        }

        await updateTapToPayRequestStatus({
          paymentRequestId: requestId,
          status: "waiting_for_tap",
          stripePaymentIntentId: paymentIntent.paymentIntentId,
          stripePaymentIntentClientSecret: paymentIntent.clientSecret,
        });

        setLastOutcome(
          useSimulatedTapToPay
            ? "Simulated Tap to Pay is running. Stripe should present the test payment flow on this phone."
            : "Waiting for card or wallet tap on this phone..."
        );
        const collected = await collectPaymentMethod({
          paymentIntent: retrieved.paymentIntent,
          skipTipping: true,
        });
        if (collected.error || !collected.paymentIntent) {
          throw new Error(collected.error?.message ?? "Card collection failed");
        }

        await updateTapToPayRequestStatus({
          paymentRequestId: requestId,
          status: "processing",
          stripePaymentIntentId: paymentIntent.paymentIntentId,
        });

        const processed = await processPaymentIntent({
          paymentIntent: collected.paymentIntent,
          skipTipping: true,
        });
        if (processed.error || !processed.paymentIntent) {
          throw new Error(processed.error?.message ?? "Payment processing failed");
        }

        await finalizeTapToPayOrder({
          paymentRequestId: requestId,
          stripePaymentIntentId: processed.paymentIntent.id,
        });
        await updateTapToPayRequestStatus({
          paymentRequestId: requestId,
          status: "succeeded",
          stripePaymentIntentId: processed.paymentIntent.id,
        });

        setLastOutcome(
          `Paid ${activeRequest.customerName ?? "Walk-in"} for €${(
            activeRequest.total / 100
          ).toFixed(2)}`
        );
      } catch (error) {
        const message = getErrorMessage(error);
        await updateTapToPayRequestStatus({
          paymentRequestId: requestId,
          status: "failed",
          stripePaymentIntentId: paymentIntentId ?? undefined,
          failureMessage: message,
        }).catch(() => undefined);

        if (paymentIntentId) {
          await cancelTapToPayPaymentIntent({
            paymentIntentId,
          }).catch(() => undefined);
        }

        setLastOutcome(message);
      } finally {
        currentRequestIdRef.current = null;
      }
    };

    void processRequest();

    return () => {
      // The active request stays in progress across request status updates.
    };
  }, [
    activeRequest,
    cancelTapToPayPaymentIntent,
    claimTapToPayRequest,
    collectPaymentMethod,
    connectedReader,
    createTapToPayPaymentIntent,
    deviceInstanceId,
    finalizeTapToPayOrder,
    isConfigured,
    processPaymentIntent,
    retrievePaymentIntent,
    updateTapToPayRequestStatus,
    useSimulatedTapToPay,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TAP TO PAY COMPANION</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>BACK</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>DEVICE</Text>
          <Text style={styles.value}>{deviceName}</Text>
          <Text style={styles.meta}>{deviceInstanceId}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>PAIRED REGISTER</Text>
          <Text style={styles.value}>
            {pairing?.pairedDevice?.name ?? "No paired iPad"}
          </Text>
          <Text style={styles.meta}>
            {pairing?.pairedPresence?.isOnline ? "ONLINE" : "OFFLINE"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>TERMINAL STATUS</Text>
          {isInitializing ? (
            <ActivityIndicator color={POSColors.accent} />
          ) : (
            <>
              <Text style={styles.value}>
                {connectedReader ? "READY ON THIS PHONE" : "NOT READY"}
              </Text>
              <Text style={styles.meta}>
                {connectionStatus.toUpperCase()} · {paymentStatus.toUpperCase()}
              </Text>
              {platform === "android" && useSimulatedTapToPay && (
                <Text style={styles.warningText}>
                  DEBUG BUILD · SIMULATED TAP TO PAY ONLY
                </Text>
              )}
              {terminalError && <Text style={styles.errorText}>{terminalError}</Text>}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>CURRENT CHECKOUT</Text>
          {activeRequest ? (
            <>
              <Text style={styles.value}>
                {"\u20AC"}
                {(activeRequest.total / 100).toFixed(2)}
              </Text>
              <Text style={styles.meta}>
                {activeRequest.status.replace(/_/g, " ").toUpperCase()}
              </Text>
            </>
          ) : (
            <Text style={styles.meta}>Waiting for checkout from the iPad POS.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>LAST OUTCOME</Text>
          <Text style={styles.meta}>
            {lastOutcome ??
              "No payment yet. Open POS mode on the paired iPad and choose Tap to Pay."}
          </Text>
        </View>

        {platform === "android" && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>ANDROID DEVICE REQUIREMENTS</Text>
            <Text style={styles.meta}>
              Tap to Pay on Android requires NFC, Google Play Services, a locked
              bootloader, current security patches, and Developer options disabled.
            </Text>
            {useSimulatedTapToPay && (
              <Text style={styles.warningText}>
                This build is debuggable, so Stripe only allows the simulated Tap
                to Pay reader here. Use a non-debug/release build for real card taps.
              </Text>
            )}
          </View>
        )}

        {!isConfigured && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>MISSING STRIPE TERMINAL CONFIG</Text>
            <Text style={styles.meta}>
              Set `EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID` and rebuild the app.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function TapToPayCompanionScreen() {
  const createConnectionToken = useAction(api.terminal.createConnectionToken);
  const {
    deviceInstanceId,
    deviceName,
    platform,
    isLoading,
  } = usePOSDeviceIdentity("tap_to_pay_companion");

  const fetchTokenProvider = useCallback(async () => {
    const result = await createConnectionToken({});
    return result.secret;
  }, [createConnectionToken]);

  if (isLoading || !deviceInstanceId) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={POSColors.accent} size="large" />
      </View>
    );
  }

  if (platform === "ipad") {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>
          Tap to Pay companion mode must run on an iPhone or Android phone, not the iPad register.
        </Text>
      </View>
    );
  }

  return (
    <StripeTerminalProvider
      tokenProvider={fetchTokenProvider}
      logLevel="verbose"
    >
      <TapToPayCompanionContent
        deviceInstanceId={deviceInstanceId}
        deviceName={deviceName}
        platform={platform}
      />
    </StripeTerminalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: POSColors.background,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.background,
    padding: POSSpacing.lg,
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
    color: POSColors.accent,
    letterSpacing: 2,
  },
  backButton: {
    borderWidth: 1,
    borderColor: POSColors.faint,
    paddingHorizontal: POSSpacing.md,
    paddingVertical: POSSpacing.sm,
  },
  backButtonText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 1,
  },
  content: {
    padding: POSSpacing.lg,
    gap: POSSpacing.md,
  },
  card: {
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.lg,
    gap: POSSpacing.sm,
  },
  warningCard: {
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.warningAmber,
    padding: POSSpacing.lg,
    gap: POSSpacing.sm,
  },
  warningTitle: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.sectionHeader,
    color: POSColors.warningAmber,
    letterSpacing: 1,
  },
  warningText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.warningAmber,
    letterSpacing: 1,
  },
  label: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.faint,
    letterSpacing: 2,
  },
  value: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.primary,
    letterSpacing: 1,
  },
  meta: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.faint,
    lineHeight: 22,
  },
  errorText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.dangerRed,
    textAlign: "center",
    lineHeight: 22,
  },
});
