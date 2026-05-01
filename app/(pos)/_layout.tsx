import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "@/contexts/auth-context";
import { POSCartProvider } from "@/contexts/pos-cart-context";
import { POSColors } from "@/constants/pos-theme";

export default function POSLayout() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Lock to landscape when entering POS mode
  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  // Auth guard: only admins can use POS
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.replace("/(customer)");
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={POSColors.accent} size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <POSCartProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: POSColors.background },
          animation: "none",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="receipt/[id]"
          options={{ presentation: "modal" }}
        />
      </Stack>
      <StatusBar hidden />
    </POSCartProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.background,
  },
});
