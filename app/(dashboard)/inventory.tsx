import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { InventoryRow } from "@/components/dashboard/InventoryRow";
import { LowStockBanner } from "@/components/dashboard/LowStockBanner";
import { ReorderAlertBanner } from "@/components/dashboard/ReorderAlertBanner";
import { useResponsive } from "@/hooks/use-responsive";

export default function InventoryScreen() {
  const items = useQuery(api["im_ingredients"].list);
  const reorderCounts = useQuery(api.im_reorders.statusCounts);
  const adjustStock = useMutation(api["im_ingredients"].adjustStock);
  const setStock = useMutation(api["im_ingredients"].setStock);
  const triggerScan = useMutation(api.im_reorder_scan.triggerScan);
  const router = useRouter();
  const { isPhone } = useResponsive();
  const scanRan = useRef(false);

  // Trigger reorder scan immediately when items load
  useEffect(() => {
    if (items && !scanRan.current) {
      scanRan.current = true;
      triggerScan();
    }
  }, [items]);

  const [search, setSearch] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    if (!items) return [{ key: "all", label: "All" }];
    const seen = new Set<string>();
    const cats: { key: string; label: string }[] = [{ key: "all", label: "All" }];
    for (const item of items) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        cats.push({
          key: item.category,
          label: item.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        });
      }
    }
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = [...items];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(lower));
    }
    if (showLowOnly) {
      result = result.filter((i) => i.currentStock <= i.parLevel);
    }
    if (selectedCategory !== "all") {
      result = result.filter((i) => i.category === selectedCategory);
    }

    // Sort: critical first (<=40% par), then low (<=100% par), then normal
    const getTier = (ratio: number) => (ratio <= 0.4 ? 0 : ratio <= 1.0 ? 1 : 2);
    result.sort((a, b) => {
      const aRatio = a.parLevel > 0 ? a.currentStock / a.parLevel : 999;
      const bRatio = b.parLevel > 0 ? b.currentStock / b.parLevel : 999;
      const tierDiff = getTier(aRatio) - getTier(bRatio);
      return tierDiff !== 0 ? tierDiff : aRatio - bRatio;
    });

    return result;
  }, [items, search, showLowOnly, selectedCategory]);

  const lowStockCount = useMemo(() => {
    if (!items) return 0;
    return items.filter((i) => i.currentStock <= i.parLevel).length;
  }, [items]);

  const handleAdjust = async (id: string, delta: number) => {
    try {
      await adjustStock({ id: id as any, delta });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to adjust stock");
    }
  };

  const handleSetQty = async (id: string, qty: number) => {
    try {
      await setStock({ id: id as any, newStock: qty });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to set stock");
    }
  };

  return (
    <View style={styles.container}>
      <LowStockBanner
        count={lowStockCount}
        onPress={() => setShowLowOnly(!showLowOnly)}
      />

      <ReorderAlertBanner
        orderedCount={reorderCounts?.ordered ?? 0}
        suggestedCount={reorderCounts?.suggested ?? 0}
        onPress={() => router.push("/(dashboard)/settings")}
      />

      {/* Search + category filters */}
      <View style={styles.filterRow}>
        <TextInput
          style={[styles.searchInput, !isPhone && styles.searchInputTablet]}
          placeholder="Search ingredients..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
        {showLowOnly && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setShowLowOnly(false)}
          >
            <Text style={styles.clearBtnText}>Show All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.catBar}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.catPill,
              selectedCategory === cat.key && styles.catPillActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.catText,
                selectedCategory === cat.key && styles.catTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tablet header */}
      {!isPhone && (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 2.5 }]}>Ingredient</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Stock</Text>
          <Text style={[styles.headerCell, { flex: 0.7 }]}>Unit</Text>
          <Text style={[styles.headerCell, { flex: 0.7 }]}>Par</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>Level</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Adjust</Text>
        </View>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <InventoryRow
            item={item}
            onAdjust={handleAdjust}
            onSetQty={handleSetQty}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {items === undefined
                ? "Loading..."
                : search
                  ? "No ingredients match"
                  : "No ingredients — run seed"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#11181C",
  },
  searchInputTablet: { maxWidth: 360 },
  clearBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  catBar: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 8, gap: 6 },
  catPill: {
    flex: 1,
    minHeight: 40,
    maxHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  catPillActive: { backgroundColor: "#3B82F6" },
  catText: { fontSize: 13, fontWeight: "600", color: "#374151", textAlign: "center" },
  catTextActive: { color: "#fff" },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  listContent: { paddingBottom: 40 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#9CA3AF" },
});
