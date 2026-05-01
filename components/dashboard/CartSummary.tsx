import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";
import { CartItemRow } from "./CartItemRow";
import { DashboardColors } from "@/constants/dashboard-theme";
import { useResponsive } from "@/hooks/use-responsive";

export interface CartEntry {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  note?: string;
}

interface CartSummaryProps {
  items: CartEntry[];
  onQtyChange: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onPlaceOrder: (note: string) => void;
  onClear: () => void;
  isPlacing?: boolean;
}

/**
 * Cart panel with item list, running total, note field, and checkout button.
 * Used in the POS screen — always visible.
 */
export function CartSummary({
  items,
  onQtyChange,
  onRemove,
  onPlaceOrder,
  onClear,
  isPlacing,
}: CartSummaryProps) {
  const { isPhone } = useResponsive();
  const [orderNote, setOrderNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const totalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    onPlaceOrder(orderNote);
    setOrderNote("");
    setShowNote(false);
  };

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Cart ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCart}>
          <Text style={styles.emptyText}>Tap items to add</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.productId}
            renderItem={({ item }) => (
              <CartItemRow
                name={item.name}
                quantity={item.quantity}
                unitPriceCents={item.unitPriceCents}
                note={item.note}
                onIncrement={() => onQtyChange(item.productId, 1)}
                onDecrement={() => onQtyChange(item.productId, -1)}
                onRemove={() => onRemove(item.productId)}
              />
            )}
            style={styles.list}
          />

          {showNote ? (
            <TextInput
              style={styles.noteInput}
              placeholder="Order note..."
              value={orderNote}
              onChangeText={setOrderNote}
              multiline
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <TouchableOpacity
              style={styles.addNoteBtn}
              onPress={() => setShowNote(true)}
            >
              <Text style={styles.addNoteText}>+ Add note</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                ${(totalCents / 100).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.placeOrderBtn, isPlacing && styles.placeOrderBtnDisabled]}
              onPress={handlePlaceOrder}
              disabled={isPlacing}
              activeOpacity={0.8}
            >
              <Text style={styles.placeOrderText}>
                {isPlacing ? "Placing..." : "PLACE ORDER"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    flex: 1,
  },
  containerPhone: {
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  emptyCart: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  addNoteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addNoteText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  noteInput: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 60,
    color: "#11181C",
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11181C",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#11181C",
  },
  placeOrderBtn: {
    backgroundColor: DashboardColors.action.placeOrder,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
