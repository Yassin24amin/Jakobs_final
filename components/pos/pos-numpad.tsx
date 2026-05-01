import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
} from "@/constants/pos-theme";

interface POSNumpadProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Max digits before decimal */
  maxWhole?: number;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "\u232B"],
];

export function POSNumpad({ value, onValueChange, maxWhole = 4 }: POSNumpadProps) {
  const handleKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === "\u232B") {
      // Backspace
      onValueChange(value.slice(0, -1));
      return;
    }

    if (key === ".") {
      // Only one decimal point
      if (value.includes(".")) return;
      onValueChange((value || "0") + ".");
      return;
    }

    // Enforce max digits before decimal
    const parts = value.split(".");
    if (parts.length === 1 && parts[0].length >= maxWhole) return;
    // Prevent leading zeros (allow "0" but not "00"; replace "0" with non-zero digit)
    if (parts.length === 1 && parts[0] === "0") {
      if (key === "0") return;
      onValueChange(key);
      return;
    }
    // Max 2 decimal places
    if (parts.length === 2 && parts[1].length >= 2) return;

    onValueChange(value + key);
  };

  return (
    <View style={styles.container}>
      {KEYS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key}
              style={[
                styles.key,
                key === "\u232B" && styles.backspaceKey,
              ]}
              onPress={() => handleKey(key)}
            >
              <Text
                style={[
                  styles.keyText,
                  key === "\u232B" && styles.backspaceText,
                ]}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: POSSpacing.tight,
  },
  row: {
    flexDirection: "row",
    gap: POSSpacing.tight,
  },
  key: {
    flex: 1,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.itemCardBg,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
  },
  backspaceKey: {
    backgroundColor: POSColors.panelBorder,
  },
  keyText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.numpad,
    color: POSColors.primary,
    fontWeight: "700",
  },
  backspaceText: {
    color: POSColors.dangerRed,
  },
});
