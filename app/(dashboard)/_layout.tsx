import React from "react";
import { useWindowDimensions } from "react-native";
import { withLayoutContext } from "expo-router";
import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { Navigator } = createMaterialTopTabNavigator();

const TopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  any,
  any
>(Navigator);

const TAB_COUNT = 4;
const MIN_TAB_HEIGHT = 44;
const MAX_TAB_HEIGHT = 56;

export default function DashboardLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();
  const tabWidth = width / TAB_COUNT;
  const insets = useSafeAreaInsets();

  return (
    <TopTabs
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        tabBarScrollEnabled: false,
        tabBarIndicatorStyle: {
          backgroundColor: colors.tint,
          height: 3,
          borderRadius: 2,
        },
        tabBarItemStyle: {
          width: tabWidth,
          minHeight: MIN_TAB_HEIGHT,
          maxHeight: MAX_TAB_HEIGHT,
          justifyContent: "center",
        },
        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: 14,
          textTransform: "uppercase",
        },
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#151718" : "#fff",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === "dark" ? "#2D2F31" : "#E5E7EB",
          paddingTop: insets.top,
          minHeight: MIN_TAB_HEIGHT + insets.top,
          maxHeight: MAX_TAB_HEIGHT + insets.top,
        },
      }}
    >
      <TopTabs.Screen name="inventory" options={{ title: "Stock" }} />
      <TopTabs.Screen name="prep" options={{ title: "Prep" }} />
      <TopTabs.Screen name="waste" options={{ title: "Waste" }} />
      <TopTabs.Screen name="settings" options={{ title: "Settings" }} />
    </TopTabs>
  );
}
