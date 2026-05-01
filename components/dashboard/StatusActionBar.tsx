import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { DashboardColors } from "@/constants/dashboard-theme";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

interface StatusActionBarProps {
  status: OrderStatus;
  onUpdateStatus: (newStatus: OrderStatus) => void;
  onReject: () => void;
}

/**
 * Context-aware action buttons that change based on current order status.
 * Single-tap progression: pending → accepted → preparing → ready → completed
 */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "ACCEPT",
  confirmed: "START PREPARING",
  preparing: "MARK READY",
  ready: "COMPLETE",
};

export function StatusActionBar({
  status,
  onUpdateStatus,
  onReject,
}: StatusActionBarProps) {
  const nextStatus = NEXT_STATUS[status];
  const actionLabel = ACTION_LABELS[status];

  if (!nextStatus || !actionLabel) return null; // No action for completed/rejected

  const handleAdvance = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onUpdateStatus(nextStatus);
  };

  const handleReject = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onReject();
  };

  // Pending: show Accept + Reject side by side
  if (status === "pending") {
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.acceptBtn]}
          onPress={handleAdvance}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.rejectBtn]}
          onPress={handleReject}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>REJECT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // All other active statuses: single advance button
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, styles.advanceBtn]}
        onPress={handleAdvance}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    flex: 6,
    backgroundColor: DashboardColors.action.accept,
  },
  rejectBtn: {
    flex: 4,
    backgroundColor: DashboardColors.action.reject,
  },
  advanceBtn: {
    flex: 1,
    backgroundColor: "#3B82F6",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
