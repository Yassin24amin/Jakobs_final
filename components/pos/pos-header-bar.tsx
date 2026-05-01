import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { POSColors, POSFonts, POSFontSizes, POSLayout, POSSpacing } from "@/constants/pos-theme";
import { POSStatusIndicator } from "./pos-status-indicator";

interface POSHeaderBarProps {
  orderNumber?: string;
}

export function POSHeaderBar({ orderNumber }: POSHeaderBarProps) {
  const { user } = useAuth();
  const router = useRouter();

  const now = new Date();
  const timeString = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>JAKOB'S POS</Text>
        <POSStatusIndicator />
      </View>

      <View style={styles.center}>
        {orderNumber && (
          <Text style={styles.orderNumber}>{orderNumber}</Text>
        )}
      </View>

      <View style={styles.right}>
        <Text style={styles.info}>{timeString}</Text>
        <Text style={styles.operator}>
          {user?.name ?? user?.email ?? "OPERATOR"}
        </Text>
        <Pressable
          style={styles.exitButton}
          onPress={() => router.replace("/(admin)")}
        >
          <Text style={styles.exitText}>EXIT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: POSLayout.headerBarHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: POSColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: POSColors.panelBorder,
    paddingHorizontal: POSSpacing.panelPadding,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: POSSpacing.sm,
  },
  title: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.primary,
    letterSpacing: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  orderNumber: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.accent,
    letterSpacing: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: POSSpacing.md,
  },
  info: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.headerInfo,
    color: POSColors.faint,
  },
  operator: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.headerInfo,
    color: POSColors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  exitButton: {
    paddingHorizontal: POSSpacing.sm,
    paddingVertical: POSSpacing.tight,
    borderWidth: 1,
    borderColor: POSColors.dangerRed,
  },
  exitText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.label,
    color: POSColors.dangerRed,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
