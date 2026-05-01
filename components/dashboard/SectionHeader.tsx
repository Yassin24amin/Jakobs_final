import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface SectionHeaderProps {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
}

/**
 * Lightweight section title with optional right action.
 */
export function SectionHeader({
  title,
  rightLabel,
  onRightPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {rightLabel && onRightPress && (
        <TouchableOpacity onPress={onRightPress}>
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  rightLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3B82F6",
  },
});
