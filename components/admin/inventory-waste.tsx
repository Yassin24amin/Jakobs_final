import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type WasteMode = 'home' | 'ingredient' | 'menuItem';

const DEFAULT_WASTE_REASONS = [
  { key: 'expired', label: 'EXPIRED' },
  { key: 'overcooked', label: 'OVERCOOKED' },
  { key: 'customer_return', label: 'RETURN' },
  { key: 'spillage', label: 'SPILLAGE' },
  { key: 'contaminated', label: 'CONTAMINATED' },
  { key: 'other', label: 'OTHER' },
];

interface WasteItem {
  ingredientId: string;
  name: string;
  quantity: string;
  unit: string;
}

export function InventoryWaste() {
  const ingredients = useQuery(api.im_ingredients.list);
  const menuItems = useQuery(api.im_menu.listAll);
  const todayWaste = useQuery(api.im_waste.todaySummary);
  const recentWaste = useQuery(api.im_waste.listRecent);
  const wasteReasonsQuery = useQuery(api.im_settings.getWasteReasons);
  const WASTE_REASONS = wasteReasonsQuery
    ? wasteReasonsQuery.map((r) => ({ key: r.key, label: r.label.toUpperCase() }))
    : DEFAULT_WASTE_REASONS;

  const reportIngredient = useMutation(api.im_waste.reportIngredientWaste);
  const reportMenuItem = useMutation(api.im_waste.reportMenuItemWaste);

  const [mode, setMode] = useState<WasteMode>('home');
  const [reason, setReason] = useState<string>('expired');
  const [reasonNote, setReasonNote] = useState('');

  // Ingredient waste state
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [pickingIngredient, setPickingIngredient] = useState(false);

  // Menu item waste state
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [menuItemQty, setMenuItemQty] = useState('1');
  const preview = useQuery(
    api.im_waste.previewMenuItemWaste,
    selectedMenuItemId
      ? { menuItemId: selectedMenuItemId as Id<'menuItems'>, menuItemQty: parseInt(menuItemQty) || 1 }
      : 'skip'
  );

  const resetForm = () => {
    setMode('home');
    setReason('expired');
    setReasonNote('');
    setWasteItems([]);
    setSelectedMenuItemId(null);
    setMenuItemQty('1');
  };

  const addIngredientLine = (ing: any) => {
    if (wasteItems.some((w) => w.ingredientId === ing._id)) return;
    setWasteItems([
      ...wasteItems,
      { ingredientId: ing._id, name: ing.name, quantity: '', unit: ing.unit },
    ]);
    setPickingIngredient(false);
  };

  const handleSubmitIngredient = async () => {
    const valid = wasteItems
      .filter((w) => parseFloat(w.quantity) > 0)
      .map((w) => ({ ingredientId: w.ingredientId as Id<'im_ingredients'>, quantity: parseFloat(w.quantity) }));
    if (valid.length === 0) {
      Alert.alert('Error', 'Add at least one item with a quantity');
      return;
    }
    try {
      await reportIngredient({ reason: reason as any, reasonNote: reasonNote || undefined, items: valid });
      Alert.alert('Recorded', `${valid.length} item(s) deducted from stock`);
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to report waste');
    }
  };

  const handleSubmitMenuItem = async () => {
    if (!selectedMenuItemId) return;
    if (parseInt(menuItemQty, 10) <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }
    try {
      await reportMenuItem({
        reason: reason as any,
        reasonNote: reasonNote || undefined,
        menuItemId: selectedMenuItemId as Id<'menuItems'>,
        menuItemQty: parseInt(menuItemQty) || 1,
      });
      Alert.alert('Recorded', 'All ingredients deducted from stock');
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to report waste');
    }
  };

  // Shared reason picker
  const reasonPicker = (
    <View style={styles.reasonSection}>
      <Text style={styles.label}>REASON</Text>
      <View style={styles.reasonGrid}>
        {WASTE_REASONS.map((r) => (
          <Pressable
            key={r.key}
            style={[styles.reasonChip, reason === r.key && styles.reasonChipActive]}
            onPress={() => setReason(r.key)}
          >
            <Text style={[styles.reasonLabel, reason === r.key && styles.reasonLabelActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="ADDITIONAL NOTES (OPTIONAL)"
        value={reasonNote}
        onChangeText={setReasonNote}
        placeholderTextColor={Colors.faint}
      />
    </View>
  );

  // ── HOME MODE ──
  if (mode === 'home') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Today's summary */}
        {todayWaste && todayWaste.reports > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>LAST 24H</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{todayWaste.reports}</Text>
                <Text style={styles.summarySub}>REPORTS</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{todayWaste.totalItems}</Text>
                <Text style={styles.summarySub}>ITEMS</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.sectionHeader}>REPORT WASTE</Text>

        {/* Raw Ingredient Card */}
        <Pressable style={styles.actionCard} onPress={() => setMode('ingredient')}>
          <View style={styles.actionCardLeft}>
            <Text style={styles.actionCardTitle}>RAW INGREDIENT</Text>
            <Text style={styles.actionCardDesc}>
              Pick ingredients and enter wasted quantities
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </Pressable>

        {/* Menu Item Card */}
        <Pressable style={styles.actionCard} onPress={() => setMode('menuItem')}>
          <View style={styles.actionCardLeft}>
            <Text style={styles.actionCardTitle}>PREPARED MENU ITEM</Text>
            <Text style={styles.actionCardDesc}>
              Deducts all recipe ingredients automatically
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </Pressable>

        {/* Recent Reports */}
        {recentWaste && recentWaste.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>RECENT</Text>
            {recentWaste.slice(0, 10).map((log) => (
              <View key={log._id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyReason}>
                    {log.reason.toUpperCase()}
                    {log.menuItemName ? ` \u00B7 ${log.menuItemQty}x ${log.menuItemName}` : ''}
                  </Text>
                </View>
                <Text style={styles.historyItems}>
                  {log.items.map((i) => `${i.quantity} ${i.unit} ${i.ingredientName}`).join(', ')}
                </Text>
                {log.reasonNote ? (
                  <Text style={styles.historyNote}>{log.reasonNote}</Text>
                ) : null}
                <Text style={styles.historyTime}>
                  {new Date(log.reportedAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  // ── INGREDIENT FORM ──
  if (mode === 'ingredient') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>INGREDIENT WASTE</Text>
          <Pressable onPress={resetForm}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Pressable>
        </View>

        {reasonPicker}

        <Text style={styles.label}>ITEMS WASTED</Text>
        {wasteItems.map((item, idx) => (
          <View key={item.ingredientId} style={styles.wasteLine}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wasteLineName}>{item.name}</Text>
              <Text style={styles.wasteLineUnit}>{item.unit}</Text>
            </View>
            <TextInput
              style={styles.wasteLineInput}
              value={item.quantity}
              onChangeText={(v) => {
                const copy = [...wasteItems];
                copy[idx].quantity = v;
                setWasteItems(copy);
              }}
              keyboardType="decimal-pad"
              placeholder="QTY"
              placeholderTextColor={Colors.faint}
            />
            <Pressable
              onPress={() => setWasteItems(wasteItems.filter((_, i) => i !== idx))}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>{'\u00D7'}</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addBtn} onPress={() => setPickingIngredient(true)}>
          <Text style={styles.addBtnText}>+ ADD INGREDIENT</Text>
        </Pressable>

        {wasteItems.length > 0 && (
          <Pressable style={styles.submitBtn} onPress={handleSubmitIngredient}>
            <Text style={styles.submitBtnText}>
              SUBMIT ({wasteItems.filter((w) => parseFloat(w.quantity) > 0).length} ITEMS)
            </Text>
          </Pressable>
        )}

        {/* Ingredient Picker Modal */}
        <Modal visible={pickingIngredient} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setPickingIngredient(false)}>
            <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>SELECT INGREDIENT</Text>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {ingredients?.map((ing) => (
                  <Pressable
                    key={ing._id}
                    style={styles.pickerItem}
                    onPress={() => addIngredientLine(ing)}
                  >
                    <Text style={styles.pickerName}>{ing.name}</Text>
                    <Text style={styles.pickerStock}>{ing.currentStock} {ing.unit}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable style={styles.modalClose} onPress={() => setPickingIngredient(false)}>
                <Text style={styles.modalCloseText}>CLOSE</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    );
  }

  // ── MENU ITEM FORM ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>MENU ITEM WASTE</Text>
        <Pressable onPress={resetForm}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
      </View>

      {reasonPicker}

      <Text style={styles.label}>SELECT MENU ITEM</Text>
      <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
        {menuItems?.map((mi) => (
          <Pressable
            key={mi._id}
            style={[styles.pickerItem, selectedMenuItemId === mi._id && styles.pickerItemActive]}
            onPress={() => setSelectedMenuItemId(mi._id)}
          >
            <Text style={[styles.pickerName, selectedMenuItemId === mi._id && { color: Colors.black }]}>
              {mi.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedMenuItemId && (
        <>
          <Text style={[styles.label, { marginTop: Spacing.md }]}>QUANTITY WASTED</Text>
          <TextInput
            style={styles.qtyInput}
            value={menuItemQty}
            onChangeText={setMenuItemQty}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor={Colors.faint}
          />

          {preview && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>INGREDIENTS TO BE DEDUCTED:</Text>
              {preview.items.map((item) => (
                <View key={item.ingredientId} style={styles.previewRow}>
                  <Text style={styles.previewName}>{item.ingredientName}</Text>
                  <Text style={styles.previewQty}>{item.quantity} {item.unit}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.submitBtn} onPress={handleSubmitMenuItem}>
            <Text style={styles.submitBtnText}>SUBMIT WASTE REPORT</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  // Summary
  summaryCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderLeftWidth: 3,
    borderLeftColor: Colors.stockCritical,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
  },
  summaryNum: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
    fontWeight: '700',
  },
  summarySub: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
    marginTop: 2,
  },
  // Section headers
  sectionHeader: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  // Action Cards
  actionCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCardLeft: {
    flex: 1,
  },
  actionCardTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  actionCardDesc: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginTop: 4,
  },
  chevron: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxl,
    color: Colors.faint,
    marginLeft: Spacing.sm,
  },
  // History
  historyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyReason: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  historyItems: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginTop: 4,
  },
  historyNote: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    fontStyle: 'italic',
    marginTop: 4,
  },
  historyTime: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginTop: 4,
  },
  // Forms
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  formTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cancelText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  // Reason Picker
  reasonSection: {
    marginBottom: Spacing.md,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reasonChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  reasonLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  reasonLabelActive: {
    color: Colors.black,
  },
  noteInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  // Waste Lines
  wasteLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  wasteLineName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  wasteLineUnit: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  wasteLineInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    width: 80,
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  removeBtn: {
    padding: Spacing.xs,
  },
  removeBtnText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.statusCancelled,
    fontWeight: '700',
  },
  addBtn: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: 0,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addBtnText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 0,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Qty Input
  qtyInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  // Preview
  previewCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  previewName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  previewQty: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.lg,
    width: Math.min(340, Dimensions.get('window').width * 0.9),
    maxHeight: '65%',
  },
  modalTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  pickerScroll: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: Colors.rule,
    marginBottom: Spacing.sm,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  pickerItemActive: {
    backgroundColor: Colors.accent,
  },
  pickerName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  pickerStock: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  modalClose: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  modalCloseText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.faint,
    letterSpacing: 1,
  },
});
