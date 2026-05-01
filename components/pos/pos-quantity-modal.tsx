import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import {
  POSColors,
  POSFonts,
  POSFontSizes,
  POSSpacing,
  POSOverlay,
} from "@/constants/pos-theme";

interface POSQuantityModalProps {
  visible: boolean;
  menuItemId: Id<"menuItems"> | null;
  name: string;
  currentQty: number;
  currentNotes: string;
  onSave: (menuItemId: Id<"menuItems">, qty: number, notes: string) => void;
  onRemove: (menuItemId: Id<"menuItems">) => void;
  onClose: () => void;
}

export function POSQuantityModal({
  visible,
  menuItemId,
  name,
  currentQty,
  currentNotes,
  onSave,
  onRemove,
  onClose,
}: POSQuantityModalProps) {
  const [qty, setQty] = useState(currentQty);
  const [notes, setNotes] = useState(currentNotes);
  const prevVisibleRef = useRef(visible);

  // Reset only when modal transitions from closed → open
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setQty(currentQty);
      setNotes(currentNotes);
    }
    prevVisibleRef.current = visible;
  }, [visible, currentQty, currentNotes]);

  const handleSave = () => {
    if (!menuItemId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(menuItemId, qty, notes);
    onClose();
  };

  const handleRemove = () => {
    if (!menuItemId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onRemove(menuItemId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{name}</Text>

          {/* Quantity stepper */}
          <View style={styles.qtyRow}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => setQty(Math.max(1, qty - 1))}
            >
              <Text style={styles.qtyBtnText}>-</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{qty}</Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => setQty(qty + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>

          {/* Notes */}
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes (e.g. no onion)"
            placeholderTextColor={POSColors.faint}
            multiline
            numberOfLines={2}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.removeBtn} onPress={handleRemove}>
              <Text style={styles.removeText}>REMOVE</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>SAVE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: POSOverlay.popup,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: 320,
    backgroundColor: POSColors.surface,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    padding: POSSpacing.lg,
  },
  title: {
    fontFamily: POSFonts.display,
    fontSize: POSFontSizes.headerTitle,
    color: POSColors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: POSSpacing.lg,
    textAlign: "center",
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: POSSpacing.lg,
    marginBottom: POSSpacing.lg,
  },
  qtyBtn: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: POSColors.panelBorder,
    borderWidth: 1,
    borderColor: POSColors.faint,
  },
  qtyBtnText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.numpad,
    color: POSColors.primary,
    fontWeight: "700",
  },
  qtyValue: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderTotal,
    color: POSColors.primary,
    fontWeight: "700",
    minWidth: 48,
    textAlign: "center",
  },
  notesInput: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.orderLine,
    color: POSColors.primary,
    borderWidth: 1,
    borderColor: POSColors.panelBorder,
    backgroundColor: POSColors.background,
    padding: POSSpacing.md,
    marginBottom: POSSpacing.lg,
    minHeight: 64,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: POSSpacing.sm,
  },
  removeBtn: {
    flex: 1,
    paddingVertical: POSSpacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: POSColors.dangerRed,
  },
  removeText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.dangerRed,
    fontWeight: "700",
    letterSpacing: 1,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: POSSpacing.md,
    alignItems: "center",
    backgroundColor: POSColors.accent,
  },
  saveText: {
    fontFamily: POSFonts.mono,
    fontSize: POSFontSizes.actionButton,
    color: POSColors.black,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
