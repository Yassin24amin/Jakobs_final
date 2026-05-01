import React from "react";
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { POSItemCard } from "./pos-item-card";
import type { MenuCategory } from "./pos-category-sidebar";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSLayout,
  POSSpacing,
} from "@/constants/pos-theme";

interface POSItemGridProps {
  category: MenuCategory;
  onItemPress: (id: Id<"menuItems">, name: string, price: number) => void;
}

export function POSItemGrid({ category, onItemPress }: POSItemGridProps) {
  // Always fetch all items — filter client-side by category.
  // listAll includes unavailable items (shown dimmed).
  const allItems = useQuery(api.menu.listAll, {});

  if (allItems === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={POSColors.accent} size="large" />
      </View>
    );
  }

  const filtered: Doc<"menuItems">[] =
    category === "all"
      ? allItems
      : allItems.filter((item: Doc<"menuItems">) => item.category === category);

  if (filtered.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>NO ITEMS</Text>
      </View>
    );
  }

  // Build rows of gridColumns items each
  const rows: (typeof filtered)[] = [];
  for (let i = 0; i < filtered.length; i += POSLayout.gridColumns) {
    rows.push(filtered.slice(i, i + POSLayout.gridColumns));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item: Doc<"menuItems">) => (
            <POSItemCard
              key={item._id}
              id={item._id}
              name={item.name}
              price={item.price}
              isAvailable={item.isAvailable}
              isSpicy={item.isSpicy}
              isSignature={item.isSignature}
              onPress={onItemPress}
            />
          ))}
          {/* Fill remaining slots to keep consistent column widths */}
          {row.length < POSLayout.gridColumns &&
            Array.from({ length: POSLayout.gridColumns - row.length }).map(
              (_, i) => <View key={`spacer-${i}`} style={styles.spacer} />
            )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: POSColors.background,
  },
  scrollContent: {
    padding: POSSpacing.panelPadding,
    paddingBottom: POSSpacing.xxl,
    gap: POSLayout.cardGap,
  },
  row: {
    flexDirection: "row",
    gap: POSLayout.cardGap,
  },
  spacer: {
    flex: 1,
    minHeight: POSLayout.cardMinHeight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.itemName,
    color: POSColors.faint,
    letterSpacing: 2,
  },
});
