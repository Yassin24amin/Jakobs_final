import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ALLOWED_REASONS = ["expired", "overcooked", "customer_return", "spillage", "contaminated", "other"] as const;
type WasteReason = (typeof ALLOWED_REASONS)[number];

const DEFAULT_WASTE_REASONS: { key: WasteReason; label: string }[] = [
  { key: "expired", label: "Expired" },
  { key: "overcooked", label: "Overcooked" },
  { key: "customer_return", label: "Customer Return" },
  { key: "spillage", label: "Spillage" },
  { key: "contaminated", label: "Contaminated" },
  { key: "other", label: "Other" },
];

export default function WasteScreen() {
  const ingredients = useQuery(api["im_ingredients"].list);
  const menuItems = useQuery(api.im_menu.listAll);
  const todayWaste = useQuery(api.im_waste.todaySummary);
  const recentWaste = useQuery(api.im_waste.listRecent);
  const wasteReasonsQuery = useQuery(api.im_settings.getWasteReasons);
  const WASTE_REASONS = (wasteReasonsQuery ?? DEFAULT_WASTE_REASONS).filter(
    (r: any) => (ALLOWED_REASONS as readonly string[]).includes(r.key)
  );
  const reportIngredient = useMutation(api.im_waste.reportIngredientWaste);
  const reportMenuItem = useMutation(api.im_waste.reportMenuItemWaste);

  const [mode, setMode] = useState<"home" | "ingredient" | "menuItem">("home");
  const [reason, setReason] = useState<string>("expired");
  const [reasonNote, setReasonNote] = useState("");

  const [wasteItems, setWasteItems] = useState<
    { ingredientId: string; name: string; quantity: string; unit: string }[]
  >([]);
  const [pickingIngredient, setPickingIngredient] = useState(false);

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [menuItemQty, setMenuItemQty] = useState("1");
  const preview = useQuery(
    api.im_waste.previewMenuItemWaste,
    selectedMenuItemId
      ? { menuItemId: selectedMenuItemId as any, menuItemQty: parseInt(menuItemQty) || 1 }
      : "skip"
  );

  const resetForm = () => {
    setMode("home");
    setReason("expired");
    setReasonNote("");
    setWasteItems([]);
    setSelectedMenuItemId(null);
    setMenuItemQty("1");
  };

  const addIngredientLine = (ing: any) => {
    if (wasteItems.some((w) => w.ingredientId === ing._id)) return;
    setWasteItems([
      ...wasteItems,
      { ingredientId: ing._id, name: ing.name, quantity: "", unit: ing.unit },
    ]);
    setPickingIngredient(false);
  };

  const handleSubmitIngredient = async () => {
    const valid = wasteItems
      .filter((w) => parseFloat(w.quantity) > 0)
      .map((w) => ({ ingredientId: w.ingredientId as any, quantity: parseFloat(w.quantity) }));
    if (valid.length === 0) return Alert.alert("Error", "Add at least one item with a quantity");
    try {
      await reportIngredient({ reason: reason as any, reasonNote: reasonNote || undefined, items: valid });
      Alert.alert("Recorded", `${valid.length} item(s) deducted from stock`);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to report ingredient waste");
    }
  };

  const handleSubmitMenuItem = async () => {
    if (!selectedMenuItemId) return;
    if (parseInt(menuItemQty, 10) <= 0) return Alert.alert("Error", "Quantity must be greater than 0");
    try {
      await reportMenuItem({
        reason: reason as any,
        reasonNote: reasonNote || undefined,
        menuItemId: selectedMenuItemId as any,
        menuItemQty: parseInt(menuItemQty) || 1,
      });
      Alert.alert("Recorded", "All ingredients deducted from stock");
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to report menu item waste");
    }
  };

  // Reason picker
  const reasonPicker = (
    <View style={st.reasonSection}>
      <Text style={st.label}>Reason</Text>
      <View style={st.reasonGrid}>
        {WASTE_REASONS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[st.reasonChip, reason === r.key && st.reasonChipActive]}
            onPress={() => setReason(r.key)}
          >
            <Text style={[st.reasonLabel, reason === r.key && st.reasonLabelActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={st.noteInput}
        placeholder="Additional notes (optional)"
        value={reasonNote}
        onChangeText={setReasonNote}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );

  // HOME
  if (mode === "home") {
    return (
      <ScrollView style={st.container} contentContainerStyle={st.content}>
        {todayWaste && todayWaste.reports > 0 && (
          <View style={st.summaryCard}>
            <Text style={st.summaryTitle}>Today</Text>
            <View style={st.summaryRow}>
              <View style={st.summaryBubble}>
                <Text style={st.summaryNum}>{todayWaste.reports}</Text>
                <Text style={st.summarySub}>reports</Text>
              </View>
              <View style={st.summaryBubble}>
                <Text style={st.summaryNum}>{todayWaste.totalItems}</Text>
                <Text style={st.summarySub}>items wasted</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={st.sectionTitle}>Report Waste</Text>

        <TouchableOpacity style={st.bigCard} onPress={() => setMode("ingredient")}>
          <View style={[st.bigIconCircle, { backgroundColor: "#DBEAFE" }]}>
            <IconSymbol name="list.bullet" size={24} color="#3B82F6" />
          </View>
          <View style={st.bigCardText}>
            <Text style={st.bigCardTitle}>Raw Ingredient</Text>
            <Text style={st.bigCardDesc}>
              Pick ingredients from stock and enter wasted quantities
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={st.bigCard} onPress={() => setMode("menuItem")}>
          <View style={[st.bigIconCircle, { backgroundColor: "#F3E8FF" }]}>
            <IconSymbol name="bag.fill" size={24} color="#8B5CF6" />
          </View>
          <View style={st.bigCardText}>
            <Text style={st.bigCardTitle}>Prepared Menu Item</Text>
            <Text style={st.bigCardDesc}>
              Select a menu item and the system deducts all recipe ingredients
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {recentWaste && recentWaste.length > 0 && (
          <>
            <Text style={[st.sectionTitle, { marginTop: 24 }]}>Recent Reports</Text>
            {recentWaste.slice(0, 10).map((log) => (
              <View key={log._id} style={st.historyCard}>
                <View style={st.historyHeader}>
                  <Text style={st.historyReason}>
                    {WASTE_REASONS.find((w) => w.key === log.reason)?.label ?? log.reason}
                    {log.menuItemName ? ` - ${log.menuItemQty}x ${log.menuItemName}` : ""}
                  </Text>
                </View>
                <Text style={st.historyItems}>
                  {log.items.map((i) => `${i.quantity} ${i.unit} ${i.ingredientName}`).join(", ")}
                </Text>
                {log.reasonNote ? (
                  <Text style={st.historyNote}>Note: {log.reasonNote}</Text>
                ) : null}
                <Text style={st.historyTime}>{new Date(log.reportedAt).toLocaleString()}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  // INGREDIENT FORM
  if (mode === "ingredient") {
    return (
      <ScrollView style={st.container} contentContainerStyle={st.content}>
        <View style={st.formHeader}>
          <Text style={st.formTitle}>Ingredient Waste</Text>
          <TouchableOpacity onPress={resetForm}>
            <Text style={st.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {reasonPicker}

        <Text style={st.label}>Items Wasted</Text>
        {wasteItems.map((item, idx) => (
          <View key={item.ingredientId} style={st.wasteLine}>
            <View style={{ flex: 1 }}>
              <Text style={st.wasteLineName}>{item.name}</Text>
              <Text style={st.wasteLineUnit}>{item.unit}</Text>
            </View>
            <TextInput
              style={st.wasteLineInput}
              value={item.quantity}
              onChangeText={(v) => {
                const copy = [...wasteItems];
                copy[idx].quantity = v;
                setWasteItems(copy);
              }}
              keyboardType="decimal-pad"
              placeholder="Qty"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => setWasteItems(wasteItems.filter((_, i) => i !== idx))}
              style={st.removeBtn}
            >
              <IconSymbol name="xmark" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={st.addBtn} onPress={() => setPickingIngredient(true)}>
          <IconSymbol name="plus" size={16} color="#3B82F6" />
          <Text style={st.addBtnText}>Add Ingredient</Text>
        </TouchableOpacity>

        {wasteItems.length > 0 && (
          <TouchableOpacity style={st.submitBtn} onPress={handleSubmitIngredient}>
            <Text style={st.submitBtnText}>
              Submit ({wasteItems.filter((w) => parseFloat(w.quantity) > 0).length} items)
            </Text>
          </TouchableOpacity>
        )}

        <Modal visible={pickingIngredient} transparent animationType="fade">
          <View style={st.modalOverlay}>
            <View style={st.modalBox}>
              <Text style={st.modalTitle}>Select Ingredient</Text>
              <ScrollView style={st.pickerScroll} nestedScrollEnabled>
                {ingredients?.map((ing) => (
                  <TouchableOpacity key={ing._id} style={st.pickerItem} onPress={() => addIngredientLine(ing)}>
                    <Text style={st.pickerText}>{ing.name}</Text>
                    <Text style={st.pickerStock}>{ing.currentStock} {ing.unit}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={st.modalClose} onPress={() => setPickingIngredient(false)}>
                <Text style={st.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // MENU ITEM FORM
  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      <View style={st.formHeader}>
        <Text style={st.formTitle}>Menu Item Waste</Text>
        <TouchableOpacity onPress={resetForm}>
          <Text style={st.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {reasonPicker}

      <Text style={st.label}>Select menu item</Text>
      <ScrollView style={st.pickerScroll} nestedScrollEnabled>
        {menuItems?.map((mi) => (
          <TouchableOpacity
            key={mi._id}
            style={[st.pickerItem, selectedMenuItemId === mi._id && st.pickerItemActive]}
            onPress={() => setSelectedMenuItemId(mi._id)}
          >
            <Text style={[st.pickerText, selectedMenuItemId === mi._id && { color: "#fff" }]}>
              {mi.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedMenuItemId && (
        <>
          <Text style={[st.label, { marginTop: 16 }]}>Quantity wasted</Text>
          <TextInput
            style={st.qtyInput}
            value={menuItemQty}
            onChangeText={setMenuItemQty}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#9CA3AF"
          />

          {preview && (
            <View style={st.previewCard}>
              <Text style={st.previewTitle}>Ingredients that will be deducted:</Text>
              {preview.items.map((item) => (
                <View key={item.ingredientId} style={st.previewRow}>
                  <Text style={st.previewName}>{item.ingredientName}</Text>
                  <Text style={st.previewQty}>{item.quantity} {item.unit}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={st.submitBtn} onPress={handleSubmitMenuItem}>
            <Text style={st.submitBtnText}>Submit Waste Report</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", borderLeftWidth: 4, borderLeftColor: "#EF4444" },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: "#11181C", marginBottom: 10 },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBubble: { flex: 1, alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10 },
  summaryNum: { fontSize: 22, fontWeight: "800", color: "#11181C" },
  summarySub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#11181C", marginBottom: 10 },
  bigCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB", gap: 14 },
  bigIconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  bigCardText: { flex: 1 },
  bigCardTitle: { fontSize: 16, fontWeight: "700", color: "#11181C" },
  bigCardDesc: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  historyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyReason: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  historyItems: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  historyNote: { fontSize: 12, color: "#6B7280", fontStyle: "italic", marginTop: 4 },
  historyTime: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  formTitle: { fontSize: 20, fontWeight: "800", color: "#11181C" },
  cancelText: { color: "#3B82F6", fontSize: 16, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 8 },
  reasonSection: { marginBottom: 20 },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: "transparent" },
  reasonChipActive: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  reasonLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  reasonLabelActive: { color: "#3B82F6" },
  noteInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginTop: 10, color: "#11181C" },
  wasteLine: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB", gap: 10 },
  wasteLineName: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  wasteLineUnit: { fontSize: 13, color: "#6B7280" },
  wasteLineInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: 80, textAlign: "center", fontSize: 16, fontWeight: "600", color: "#11181C" },
  removeBtn: { padding: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderColor: "#3B82F6", borderStyle: "dashed", borderRadius: 12, padding: 14, marginBottom: 16 },
  addBtnText: { color: "#3B82F6", fontSize: 15, fontWeight: "600" },
  submitBtn: { backgroundColor: "#EF4444", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", borderRadius: 20, padding: 20, width: Math.min(360, Dimensions.get("window").width * 0.9), maxHeight: "65%" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#11181C", marginBottom: 12 },
  pickerScroll: { maxHeight: 220, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, marginBottom: 8 },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  pickerItemActive: { backgroundColor: "#3B82F6" },
  pickerText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  pickerStock: { fontSize: 13, color: "#9CA3AF" },
  modalClose: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4 },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  qtyInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, fontWeight: "700", textAlign: "center", color: "#11181C" },
  previewCard: { backgroundColor: "#FEF2F2", borderRadius: 14, padding: 14, marginTop: 16 },
  previewTitle: { fontSize: 14, fontWeight: "700", color: "#991B1B", marginBottom: 8 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  previewName: { fontSize: 14, color: "#374151" },
  previewQty: { fontSize: 14, color: "#6B7280" },
});
