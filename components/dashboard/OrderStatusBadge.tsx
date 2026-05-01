import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DashboardColors } from "@/constants/dashboard-theme";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Done",
  cancelled: "Cancelled",
};

/**
 * Color-coded status pill for order cards.
 */
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const color = DashboardColors.status[status];
  return (
    <View style={[styles.badge, { backgroundColor: color + "20" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
