import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import * as ScreenOrientation from "expo-screen-orientation";
import { api } from "@/convex/_generated/api";
import { usePOSCart } from "@/contexts/pos-cart-context";
import { usePOSDeviceIdentity } from "@/hooks/use-pos-device";
import { Id } from "@/convex/_generated/dataModel";
import { POSHeaderBar } from "@/components/pos/pos-header-bar";
import {
  POSCategorySidebar,
  type MenuCategory,
} from "@/components/pos/pos-category-sidebar";
import { POSItemGrid } from "@/components/pos/pos-item-grid";
import { POSOrderPanel } from "@/components/pos/pos-order-panel";
import { POSCashModal } from "@/components/pos/pos-cash-modal";
import { POSCardPaymentModal } from "@/components/pos/pos-card-payment-modal";
import { POSTapToPayModal } from "@/components/pos/pos-tap-to-pay-modal";
import { POSReceiptView } from "@/components/pos/pos-receipt-view";
import { POSColors } from "@/constants/pos-theme";

export default function POSScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("all");
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTapToPayModal, setShowTapToPayModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const setDevicePresence = useMutation(api.pos_devices.setPresence);
  const {
    deviceInstanceId,
    isLoading: isDeviceLoading,
    platform,
  } = usePOSDeviceIdentity("register");

  const {
    addItem,
    items,
    total,
    cashTendered,
    changeDue,
    lastCompletedOrderNumber,
    resetForNextOrder,
  } = usePOSCart();

  // Store receipt data before cart resets
  const [receiptData, setReceiptData] = useState<{
    orderNumber: string;
    items: typeof items;
    total: number;
    paymentMethod:
      | "cash"
      | "sumup_terminal"
      | "stripe_tap_to_pay_iphone"
      | "stripe_tap_to_pay_android";
    cashTendered?: number;
    changeGiven?: number;
  } | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (isDeviceLoading) return;
    if (platform !== "ipad") {
      router.replace("./tap-to-pay-companion");
    }
  }, [isDeviceLoading, platform, router]);

  useEffect(() => {
    if (!deviceInstanceId || platform !== "ipad") return;

    const heartbeat = () => {
      setDevicePresence({
        deviceInstanceId,
        status: "register_ready",
      }).catch(console.error);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 10_000);

    return () => {
      clearInterval(interval);
      setDevicePresence({
        deviceInstanceId,
        status: "offline",
      }).catch(() => undefined);
    };
  }, [deviceInstanceId, platform, setDevicePresence]);

  const handleItemPress = useCallback(
    (id: Id<"menuItems">, name: string, price: number) => {
      addItem(id, name, price);
    },
    [addItem]
  );

  const handleCash = useCallback(() => {
    setShowCashModal(true);
  }, []);

  const handleCard = useCallback(() => {
    setShowCardModal(true);
  }, []);

  const handleTapToPay = useCallback(() => {
    setShowTapToPayModal(true);
  }, []);

  const handleCashComplete = useCallback(() => {
    // Snapshot receipt data before modal closes
    setReceiptData({
      orderNumber: lastCompletedOrderNumber ?? "---",
      items: [...items],
      total,
      paymentMethod: "cash",
      cashTendered,
      changeGiven: changeDue,
    });
    setShowCashModal(false);
    setShowReceipt(true);
  }, [items, total, cashTendered, changeDue, lastCompletedOrderNumber]);

  const handleCardComplete = useCallback(() => {
    setReceiptData({
      orderNumber: lastCompletedOrderNumber ?? "---",
      items: [...items],
      total,
      paymentMethod: "sumup_terminal",
    });
    setShowCardModal(false);
    setShowReceipt(true);
  }, [items, total, lastCompletedOrderNumber]);

  const handleSwitchToCash = useCallback(() => {
    setShowCardModal(false);
    setShowCashModal(true);
  }, []);

  const handleSwitchToCardTerminal = useCallback(() => {
    setShowTapToPayModal(false);
    setShowCardModal(true);
  }, []);

  const handleTapToPayComplete = useCallback(
    ({
      orderNumber,
      paymentMethod,
    }: {
      orderNumber: string;
      paymentMethod: "stripe_tap_to_pay_iphone" | "stripe_tap_to_pay_android";
    }) => {
      setReceiptData({
        orderNumber,
        items: [...items],
        total,
        paymentMethod,
      });
      setShowTapToPayModal(false);
      setShowReceipt(true);
    },
    [items, total]
  );

  const handleDismissReceipt = useCallback(() => {
    setShowReceipt(false);
    setReceiptData(null);
    resetForNextOrder();
  }, [resetForNextOrder]);

  // Check if SumUp is configured (heuristic: env var presence checked at runtime)
  // For now, we always show the card button but it will fail gracefully
  // with a "not configured" message if env vars aren't set
  const isSumUpConfigured = true;

  if (isDeviceLoading || platform !== "ipad") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={POSColors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <POSHeaderBar />

      {/* Main three-panel layout */}
      <View style={styles.mainContent}>
        {/* Left: Category sidebar */}
        <POSCategorySidebar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        {/* Center: Item grid */}
        <POSItemGrid category={activeCategory} onItemPress={handleItemPress} />

        {/* Right: Order panel */}
        <POSOrderPanel
          onCash={handleCash}
          onCard={handleCard}
          onTapToPay={handleTapToPay}
          isSumUpConfigured={isSumUpConfigured}
          isTapToPayAvailable={Boolean(deviceInstanceId)}
        />
      </View>

      {/* Cash payment modal */}
      <POSCashModal
        visible={showCashModal}
        onClose={() => setShowCashModal(false)}
        onComplete={handleCashComplete}
      />

      {/* Card payment modal */}
      <POSCardPaymentModal
        visible={showCardModal}
        onClose={() => setShowCardModal(false)}
        onComplete={handleCardComplete}
        onSwitchToCash={handleSwitchToCash}
      />

      <POSTapToPayModal
        visible={showTapToPayModal}
        registerDeviceInstanceId={deviceInstanceId}
        onClose={() => setShowTapToPayModal(false)}
        onComplete={handleTapToPayComplete}
        onSwitchToCash={() => {
          setShowTapToPayModal(false);
          setShowCashModal(true);
        }}
        onSwitchToCardTerminal={handleSwitchToCardTerminal}
      />

      {/* Receipt overlay */}
      {showReceipt && receiptData && (
        <POSReceiptView
          orderNumber={receiptData.orderNumber}
          items={receiptData.items}
          total={receiptData.total}
          paymentMethod={receiptData.paymentMethod}
          cashTendered={receiptData.cashTendered}
          changeGiven={receiptData.changeGiven}
          onDismiss={handleDismissReceipt}
        />
      )}
    </View>
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
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
});
