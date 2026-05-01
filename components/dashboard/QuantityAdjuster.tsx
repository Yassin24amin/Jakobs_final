import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Text,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface QuantityAdjusterProps {
  value: number;
  unit?: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetValue?: (value: number) => void;
}

/**
 * Reusable +/- stepper with haptic feedback.
 * Long-press opens a numeric input for bulk adjustments.
 */
export function QuantityAdjuster({
  value,
  unit,
  onIncrement,
  onDecrement,
  onSetValue,
}: QuantityAdjusterProps) {
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkValue, setBulkValue] = useState("");

  const handlePress = (action: () => void) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    action();
  };

  const handleLongPress = () => {
    if (!onSetValue) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setBulkValue(String(value));
    setShowBulkInput(true);
  };

  const handleBulkSubmit = () => {
    const num = parseFloat(bulkValue);
    if (!isNaN(num) && onSetValue) {
      onSetValue(num);
    }
    setShowBulkInput(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => handlePress(onDecrement)}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <IconSymbol name="minus" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>
          {value}
          {unit ? ` ${unit}` : ""}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => handlePress(onIncrement)}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <IconSymbol name="plus" size={20} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showBulkInput} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Quantity</Text>
            <TextInput
              style={styles.modalInput}
              value={bulkValue}
              onChangeText={setBulkValue}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleBulkSubmit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowBulkInput(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleBulkSubmit}
              >
                <Text style={styles.modalConfirmText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  valueContainer: {
    minWidth: 60,
    alignItems: "center",
  },
  valueText: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: 280,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#11181C",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    fontSize: 24,
    textAlign: "center",
    marginBottom: 16,
    color: "#11181C",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
