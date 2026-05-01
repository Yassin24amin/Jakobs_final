import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSLayout,
  POSSpacing,
} from "@/constants/pos-theme";

interface POSActionBarProps {
  isEmpty: boolean;
  onCash: () => void;
  onCard: () => void;
  onClear: () => void;
  isSumUpConfigured?: boolean;
}

export function POSActionBar({
  isEmpty,
  onCash,
  onCard,
  onClear,
  isSumUpConfigured = false,
}: POSActionBarProps) {
  const handleCash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCash();
  };

  const handleCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCard();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClear();
  };

  return (
    <View style={styles.container}>
      {/* Cash button */}
      <Pressable
        style={[styles.button, styles.cashButton, isEmpty && styles.disabled]}
        onPress={handleCash}
        disabled={isEmpty}
      >
        <Text style={[styles.buttonText, styles.cashText]}>
          CASH
        </Text>
      </Pressable>

      {/* Card button */}
      <Pressable
        style={[
          styles.button,
          styles.cardButton,
          (isEmpty || !isSumUpConfigured) && styles.disabled,
        ]}
        onPress={handleCard}
        disabled={isEmpty || !isSumUpConfigured}
      >
        <Text style={[styles.buttonText, styles.cardText]}>
          {isSumUpConfigured ? "CARD" : "CARD N/A"}
        </Text>
      </Pressable>

      {/* Clear button */}
      <Pressable
        style={[styles.button, styles.clearButton, isEmpty && styles.disabled]}
        onPress={handleClear}
        disabled={isEmpty}
      >
        <Text style={[styles.buttonText, styles.clearText]}>CLR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: POSLayout.actionBarHeight,
    flexDirection: "row",
    gap: POSSpacing.tight,
    paddingHorizontal: POSSpacing.panelPadding,
    paddingVertical: POSSpacing.tight,
    borderTopWidth: 1,
    borderTopColor: POSColors.panelBorder,
    backgroundColor: POSColors.surface,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: POSLayout.touchTargetMin,
  },
  cashButton: {
    backgroundColor: POSColors.cashGreen,
    flex: 2,
  },
  cardButton: {
    backgroundColor: POSColors.cardBlue,
    flex: 2,
  },
  clearButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: POSColors.dangerRed,
    flex: 1,
  },
  disabled: {
    opacity: 0.3,
  },
  buttonText: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.actionButton,
    fontWeight: "700",
    letterSpacing: 2,
  },
  cashText: {
    color: POSColors.black,
  },
  cardText: {
    color: POSColors.white,
  },
  clearText: {
    color: POSColors.dangerRed,
  },
});
