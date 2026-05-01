import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface CartItemRowProps {
  name: string;
  quantity: number;
  unitPriceCents: number;
  note?: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/**
 * Single line item in the POS cart with inline +/- and delete.
 */
export function CartItemRow({
  name,
  quantity,
  unitPriceCents,
  note,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemRowProps) {
  const lineTotal = (quantity * unitPriceCents) / 100;

  return (
    <View style={styles.container}>
      <View style={styles.infoSection}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {note ? (
          <Text style={styles.note} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.smallBtn} onPress={onDecrement}>
          <IconSymbol name="minus" size={14} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.qty}>{quantity}</Text>
        <TouchableOpacity style={styles.smallBtn} onPress={onIncrement}>
          <IconSymbol name="plus" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.total}>${lineTotal.toFixed(2)}</Text>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <IconSymbol name="xmark" size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  infoSection: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11181C",
  },
  note: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  qty: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
    color: "#11181C",
  },
  total: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11181C",
    minWidth: 55,
    textAlign: "right",
  },
  removeBtn: {
    padding: 6,
  },
});
