import React from "react";
import { FlatList, StyleSheet, View, Text } from "react-native";
import { MenuItemTile } from "./MenuItemTile";
import { Doc } from "@/convex/_generated/dataModel";

interface CartItem {
  productId: string;
  quantity: number;
}

interface MenuGridProps {
  products: Doc<"menuItems">[];
  cart: CartItem[];
  columns: number;
  onAddItem: (product: Doc<"menuItems">) => void;
}

/**
 * Category-filtered product grid for POS. Renders in variable columns based on screen size.
 */
export function MenuGrid({
  products,
  cart,
  columns,
  onAddItem,
}: MenuGridProps) {
  const getCartQty = (productId: string) => {
    const item = cart.find((c) => c.productId === productId);
    return item?.quantity ?? 0;
  };

  if (products.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No items in this category</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item._id}
      numColumns={columns}
      key={`grid-${columns}`} // Force re-render when columns change
      renderItem={({ item }) => (
        <MenuItemTile
          name={item.name}
          price={item.price}
          isAvailable={item.isAvailable}
          cartQty={getCartQty(item._id)}
          onPress={() => onAddItem(item)}
        />
      )}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 6,
    paddingBottom: 20,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
});
