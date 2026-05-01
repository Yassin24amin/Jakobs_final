import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ClerkConvexProvider } from "@/providers/clerk-convex-provider";

/**
 * Root layout.
 * Currently renders the dashboard directly (no auth).
 * When Clerk is added, this will gate on SignedIn/SignedOut
 * and use useAuthRole() to pick (tabs) vs (dashboard).
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ClerkConvexProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(dashboard)" />
          <Stack.Screen
            name="(tabs)"
            redirect
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClerkConvexProvider>
  );
}
