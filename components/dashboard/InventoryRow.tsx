import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { QuantityAdjuster } from "./QuantityAdjuster";
import { getStockColor } from "@/constants/dashboard-theme";
import { useResponsive } from "@/hooks/use-responsive";
import { Doc } from "@/convex/_generated/dataModel";

interface InventoryRowProps {
  item: Doc<"im_ingredients">;
  onAdjust: (id: string, delta: number) => void;
  onSetQty: (id: string, qty: number) => void;
}

/**
 * Single ingredient row with par-level indicator, stock color, +/- controls.
 * iPad: wide table row. Phone: compact two-line.
 */
export function InventoryRow({ item, onAdjust, onSetQty }: InventoryRowProps) {
  const { isPhone } = useResponsive();
  const stockColor = getStockColor(item.currentStock, item.parLevel);
  const stockPct = item.parLevel > 0 ? item.currentStock / item.parLevel : 1;

  if (isPhone) {
    return (
      <View style={styles.phoneRow}>
        <View style={styles.phoneLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.phoneDetail}>
            <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
            <Text style={[styles.qtyText, { color: stockColor }]}>
              {item.currentStock} {item.unit}
            </Text>
            <Text style={styles.parText}>
              par: {item.parLevel}
            </Text>
          </View>
          {/* Mini par bar */}
          <View style={styles.parBarBg}>
            <View
              style={[
                styles.parBarFill,
                {
                  backgroundColor: stockColor,
                  width: `${Math.min(100, stockPct * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
        <QuantityAdjuster
          value={item.currentStock}
          unit={item.unit}
          onIncrement={() => onAdjust(item._id, 1)}
          onDecrement={() => onAdjust(item._id, -1)}
          onSetValue={(v) => onSetQty(item._id, v)}
        />
      </View>
    );
  }

  // Tablet: table row
  return (
    <View style={styles.tabletRow}>
      <View style={[styles.tabletCell, { flex: 2.5 }]}>
        <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
        <Text style={styles.itemName}>{item.name}</Text>
      </View>
      <Text style={[styles.tabletVal, { color: stockColor, fontWeight: "700", flex: 1 }]}>
        {item.currentStock}
      </Text>
      <Text style={[styles.tabletVal, { flex: 0.7 }]}>{item.unit}</Text>
      <Text style={[styles.tabletVal, { flex: 0.7 }]}>{item.parLevel}</Text>
      <View style={[styles.tabletBarCell, { flex: 1.2 }]}>
        <View style={styles.parBarBg}>
          <View
            style={[
              styles.parBarFill,
              {
                backgroundColor: stockColor,
                width: `${Math.min(100, stockPct * 100)}%`,
              },
            ]}
          />
        </View>
      </View>
      <View style={{ flex: 1.5 }}>
        <QuantityAdjuster
          value={item.currentStock}
          onIncrement={() => onAdjust(item._id, 1)}
          onDecrement={() => onAdjust(item._id, -1)}
          onSetValue={(v) => onSetQty(item._id, v)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  phoneLeft: { flex: 1, marginRight: 12 },
  phoneDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  tabletRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  tabletCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabletVal: {
    fontSize: 14,
    color: "#374151",
  },
  tabletBarCell: {
    justifyContent: "center",
  },
  itemName: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  stockDot: { width: 10, height: 10, borderRadius: 5 },
  qtyText: { fontSize: 15, fontWeight: "600" },
  parText: { fontSize: 13, color: "#9CA3AF" },
  parBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginTop: 6,
    overflow: "hidden",
  },
  parBarFill: {
    height: 6,
    borderRadius: 3,
  },
});
