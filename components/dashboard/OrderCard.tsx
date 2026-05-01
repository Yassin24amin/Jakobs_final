import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { StatusActionBar } from "./StatusActionBar";
import { Doc } from "@/convex/_generated/dataModel";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

interface OrderCardProps {
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onReject: (orderId: string) => void;
  compact?: boolean; // true when showing in master list on iPad
}

/**
 * Self-contained order card showing all info + inline actions.
 * No detail screen needed — everything visible on the card.
 */
export function OrderCard({
  order,
  items,
  onUpdateStatus,
  onReject,
  compact,
}: OrderCardProps) {
  const timeAgo = getTimeAgo(order.createdAt);
  const isUrgent =
    order.status === "pending" && Date.now() - order.createdAt > 3 * 60 * 1000;

  const itemsSummary = items
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");

  return (
    <View style={[styles.card, isUrgent && styles.cardUrgent]}>
      <View style={styles.headerRow}>
        <View style={styles.orderNumRow}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <OrderStatusBadge status={order.status as OrderStatus} />
        </View>
        <Text style={[styles.timeAgo, isUrgent && styles.timeAgoUrgent]}>
          {timeAgo}
        </Text>
      </View>

      {order.customerName && (
        <Text style={styles.customerName}>{order.customerName}</Text>
      )}

      <Text style={styles.itemsSummary} numberOfLines={compact ? 1 : 2}>
        {itemsSummary || "No items"}
      </Text>

      {order.notes ? (
        <Text style={styles.note} numberOfLines={1}>
          Note: {order.notes}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.source}>
          {order.orderSource === "online" ? "Online" : "In-store"}
        </Text>
        <Text style={styles.total}>
          ${(order.total / 100).toFixed(2)}
        </Text>
      </View>

      {!compact && (
        <StatusActionBar
          status={order.status as OrderStatus}
          onUpdateStatus={(newStatus) =>
            onUpdateStatus(order._id, newStatus)
          }
          onReject={() => onReject(order._id)}
        />
      )}
    </View>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUrgent: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderNumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#11181C",
  },
  timeAgo: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  timeAgoUrgent: {
    color: "#EF4444",
    fontWeight: "700",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  itemsSummary: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 4,
  },
  note: {
    fontSize: 13,
    color: "#8B5CF6",
    fontStyle: "italic",
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  source: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  total: {
    fontSize: 20,
    fontWeight: "800",
    color: "#11181C",
  },
});
