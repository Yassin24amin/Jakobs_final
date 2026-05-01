import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { usePOSCart } from "@/contexts/pos-cart-context";
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
import { POSReceiptView } from "@/components/pos/pos-receipt-view";
import { POSColors } from "@/constants/pos-theme";

export default function POSScreen() {
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("all");
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const {
    addItem,
    items,
    total,
    cashTendered,
    changeDue,
    paymentState,
    lastCompletedOrderNumber,
    resetForNextOrder,
  } = usePOSCart();

  // Store receipt data before cart resets
  const [receiptData, setReceiptData] = useState<{
    orderNumber: string;
    items: typeof items;
    total: number;
    paymentMethod: "cash" | "sumup_terminal";
    cashTendered?: number;
    changeGiven?: number;
  } | null>(null);

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

  const handleDismissReceipt = useCallback(() => {
    setShowReceipt(false);
    setReceiptData(null);
    resetForNextOrder();
  }, [resetForNextOrder]);

  // Check if SumUp is configured (heuristic: env var presence checked at runtime)
  // For now, we always show the card button but it will fail gracefully
  // with a "not configured" message if env vars aren't set
  const isSumUpConfigured = true;

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
          isSumUpConfigured={isSumUpConfigured}
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
  mainContent: {
    flex: 1,
    flexDirection: "row",
  },
});
