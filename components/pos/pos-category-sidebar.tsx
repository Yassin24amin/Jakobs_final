import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSLayout,
  POSSpacing,
} from "@/constants/pos-theme";

export type MenuCategory =
  | "all"
  | "shawarma"
  | "doner"
  | "pizza"
  | "sides"
  | "drinks"
  | "extras";

const CATEGORIES: { key: MenuCategory; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "shawarma", label: "SHAWARMA" },
  { key: "doner", label: "DONER" },
  { key: "pizza", label: "PIZZA" },
  { key: "sides", label: "SIDES" },
  { key: "drinks", label: "DRINKS" },
  { key: "extras", label: "EXTRAS" },
];

interface POSCategorySidebarProps {
  activeCategory: MenuCategory;
  onSelectCategory: (category: MenuCategory) => void;
}

export function POSCategorySidebar({
  activeCategory,
  onSelectCategory,
}: POSCategorySidebarProps) {
  const handlePress = (category: MenuCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectCategory(category);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[styles.button, isActive && styles.buttonActive]}
              onPress={() => handlePress(cat.key)}
            >
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: POSLayout.sidebarWidth,
    backgroundColor: POSColors.surface,
    borderRightWidth: 1,
    borderRightColor: POSColors.panelBorder,
  },
  scrollContent: {
    paddingVertical: POSSpacing.tight,
  },
  button: {
    minHeight: POSLayout.touchTargetMin,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: POSSpacing.sm,
    paddingVertical: POSSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: POSColors.panelBorder,
  },
  buttonActive: {
    backgroundColor: POSColors.accent,
  },
  label: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.categoryTab,
    color: POSColors.faint,
    letterSpacing: 1,
    textAlign: "center",
  },
  labelActive: {
    color: POSColors.black,
  },
});
