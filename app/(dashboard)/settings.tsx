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
  Linking,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DashboardColors, getStockColor } from "@/constants/dashboard-theme";
import { useResponsive } from "@/hooks/use-responsive";
import { IconSymbol } from "@/components/ui/icon-symbol";

// ─── Reorder status colors ───
const STATUS_COLORS: Record<string, string> = {
  suggested: "#F59E0B",
  approved: "#3B82F6",
  ordered: "#8B5CF6",
  received: "#10B981",
  dismissed: "#6B7280",
};

export default function SettingsScreen() {
  const { isPhone } = useResponsive();
  const [activeSection, setActiveSection] = useState<"reorders" | "thresholds" | "system">("reorders");

  return (
    <View style={styles.container}>
      {/* Section tabs */}
      <View style={styles.sectionBar}>
        {([
          { key: "reorders", label: "Reorders" },
          { key: "thresholds", label: "Ingredients" },
          { key: "system", label: "System" },
        ] as const).map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sectionPill, activeSection === s.key && styles.sectionPillActive]}
            onPress={() => setActiveSection(s.key)}
          >
            <Text style={[styles.sectionText, activeSection === s.key && styles.sectionTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSection === "reorders" && <ReorderSection />}
      {activeSection === "thresholds" && <ThresholdSection />}
      {activeSection === "system" && <SystemSection />}
    </View>
  );
}

// ═══════════════════════════════════════════
// SECTION 1: Reorder Management
// ═══════════════════════════════════════════
function ReorderSection() {
  const pending = useQuery(api.im_reorders.listPending);
  const counts = useQuery(api.im_reorders.statusCounts);
  const approve = useMutation(api.im_reorders.approve);
  const dismiss = useMutation(api.im_reorders.dismiss);
  const markOrdered = useMutation(api.im_reorders.markOrdered);
  const markReceived = useMutation(api.im_reorders.markReceived);

  const suppliers = useQuery(api.im_suppliers.list);

  // Manual reorder
  const [showManual, setShowManual] = useState(false);
  const ingredients = useQuery(api["im_ingredients"].list);
  const createManual = useMutation(api.im_reorders.createManual);
  const [manualIngId, setManualIngId] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState("");

  const handleManualCreate = async () => {
    const qty = parseFloat(manualQty);
    if (!manualIngId || isNaN(qty) || qty <= 0) return Alert.alert("Error", "Select an ingredient and enter a valid quantity");
    try {
      await createManual({ ingredientId: manualIngId as any, quantity: parseFloat(manualQty) });
      setShowManual(false);
      setManualIngId(null);
      setManualQty("");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create reorder");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Summary badges */}
      {counts && (
        <View style={styles.countRow}>
          <CountBadge label="Suggested" count={counts.suggested} color="#F59E0B" />
          <CountBadge label="Approved" count={counts.approved} color="#3B82F6" />
          <CountBadge label="Ordered" count={counts.ordered} color="#8B5CF6" />
        </View>
      )}

      {/* Manual reorder button */}
      <TouchableOpacity style={styles.manualBtn} onPress={() => setShowManual(true)}>
        <IconSymbol name="plus" size={18} color="#fff" />
        <Text style={styles.manualBtnText}>Manual Reorder</Text>
      </TouchableOpacity>

      {/* Reorder list */}
      {pending?.map((r) => (
        <View key={r._id} style={[
          styles.reorderCard,
          r.status === "ordered" && (r.trigger === "critical" || r.trigger === "expiry") && styles.reorderCardUrgent,
        ]}>
          <View style={styles.reorderHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reorderName}>{r.ingredientName}</Text>
              <Text style={styles.reorderDetail}>
                {r.quantity} {r.unit}
                {r.supplierName ? ` · ${r.supplierName}` : ""}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[r.status] + "20" }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[r.status] }]}>
                {r.trigger === "critical" || r.trigger === "expiry" ? "URGENT " : ""}{r.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: r.trigger === "expiry" ? "#FEF3C7" : r.trigger === "critical" ? "#FEE2E2" : "#EFF6FF", borderRadius: 8, padding: 10, marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: r.trigger === "expiry" ? "#92400E" : r.trigger === "critical" ? "#991B1B" : "#1E40AF" }}>
              {r.reason
                ? r.reason
                : r.trigger === "critical"
                  ? `Low stock (critical): below 40% of par level`
                  : r.trigger === "expiry"
                    ? `Expiring soon: check expiry date`
                    : r.trigger === "manual"
                      ? `Manually requested`
                      : `Low stock: below par level`}
            </Text>
          </View>
          {/* Supplier contact — single preferred method */}
          {r.supplierId && (() => {
            const sup = suppliers?.find((s) => s._id === r.supplierId);
            if (!sup) return null;
            const getValidMethod = (s: any) => {
              if (s.preferredContact === "whatsapp" && s.whatsapp) return "whatsapp";
              if (s.preferredContact === "email" && s.email) return "email";
              if (s.preferredContact === "phone" && s.phone) return "phone";
              if (s.phone) return "phone";
              if (s.whatsapp) return "whatsapp";
              if (s.email) return "email";
              return "phone";
            };
            const method = getValidMethod(sup);
            const buildMsg = () => {
              const orderLine = `\n\nOrder: ${r.quantity} ${r.unit} of ${r.ingredientName}`;
              if (sup.orderMessageTemplate) {
                return sup.orderMessageTemplate + orderLine;
              }
              return `Hi, this is Jakob's Kitchen.${orderLine}\n\nPlease confirm. Thank you.`;
            };
            const onContact = () => {
              const msg = buildMsg();
              if (method === "whatsapp" && sup.whatsapp) {
                const num = sup.whatsapp.replace(/[^0-9]/g, "");
                Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
              } else if (method === "email" && sup.email) {
                const subject = encodeURIComponent(`Order: ${r.ingredientName}`);
                Linking.openURL(`mailto:${sup.email}?subject=${subject}&body=${encodeURIComponent(msg)}`);
              } else if (sup.phone) {
                Linking.openURL(`tel:${sup.phone}`);
              }
            };
            const label = method === "whatsapp" ? "WhatsApp" : method === "email" ? "Email" : "Call";
            const color = method === "whatsapp" ? "#25D366" : method === "email" ? "#2563EB" : "#16A34A";
            return (
              <TouchableOpacity style={[styles.contactFullBtn, { backgroundColor: color }]} onPress={onContact}>
                <Text style={styles.contactBtnText}>Contact {sup.name} via {label}</Text>
              </TouchableOpacity>
            );
          })()}
          <View style={styles.reorderActions}>
            {r.status === "suggested" && (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: DashboardColors.action.accept }]} onPress={async () => { try { await approve({ id: r._id }); } catch (err: any) { Alert.alert("Error", err?.message ?? "Failed to approve"); } }}>
                  <Text style={styles.actionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#6B7280" }]} onPress={async () => { try { await dismiss({ id: r._id }); } catch (err: any) { Alert.alert("Error", err?.message ?? "Failed to dismiss"); } }}>
                  <Text style={styles.actionText}>Dismiss</Text>
                </TouchableOpacity>
              </>
            )}
            {r.status === "approved" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#8B5CF6" }]} onPress={async () => { try { await markOrdered({ id: r._id }); } catch (err: any) { Alert.alert("Error", err?.message ?? "Failed to mark ordered"); } }}>
                <Text style={styles.actionText}>Mark Ordered</Text>
              </TouchableOpacity>
            )}
            {r.status === "ordered" && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: DashboardColors.action.accept }]} onPress={async () => { try { await markReceived({ id: r._id }); } catch (err: any) { Alert.alert("Error", err?.message ?? "Failed to mark received"); } }}>
                <Text style={styles.actionText}>Mark Received</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {(!pending || pending.length === 0) && (
        <Text style={styles.emptyText}>No pending reorders</Text>
      )}

      {/* Manual reorder modal */}
      <Modal visible={showManual} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Reorder</Text>
            <Text style={styles.modalLabel}>Ingredient</Text>
            <ScrollView style={styles.ingredientPicker} nestedScrollEnabled>
              {ingredients?.map((ing) => (
                <TouchableOpacity
                  key={ing._id}
                  style={[styles.pickItem, manualIngId === ing._id && styles.pickItemActive]}
                  onPress={() => setManualIngId(ing._id)}
                >
                  <Text style={[styles.pickText, manualIngId === ing._id && { color: "#fff" }]}>
                    {ing.name} ({ing.currentStock} {ing.unit})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Quantity</Text>
            <TextInput
              style={styles.modalInput}
              value={manualQty}
              onChangeText={setManualQty}
              keyboardType="decimal-pad"
              placeholder="Amount to order"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#6B7280", flex: 1 }]} onPress={() => setShowManual(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: DashboardColors.action.accept, flex: 1, opacity: manualIngId && manualQty ? 1 : 0.4 }]}
                onPress={handleManualCreate}
                disabled={!manualIngId || !manualQty}
              >
                <Text style={styles.actionText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
// SECTION 2: Ingredient Thresholds
// ═══════════════════════════════════════════
const CONTACT_METHODS = [
  { key: "phone", label: "Call" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
] as const;

function ThresholdSection() {
  const ingredients = useQuery(api["im_ingredients"].list);
  const allSuppliers = useQuery(api.im_suppliers.list);
  const updateIngredient = useMutation(api["im_ingredients"].update);
  const updateSupplier = useMutation(api.im_suppliers.update);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPar, setEditPar] = useState("");
  const [editReorder, setEditReorder] = useState("");
  const [editShelfLife, setEditShelfLife] = useState("");
  const [editContact, setEditContact] = useState<string>("phone");
  const [editTemplate, setEditTemplate] = useState("");

  const startEdit = (ing: any) => {
    setEditing(ing._id);
    setEditPar(String(ing.parLevel));
    setEditReorder(String(ing.reorderQty));
    setEditShelfLife(ing.shelfLifeDays ? String(ing.shelfLifeDays) : "");
    if (ing.supplierId && allSuppliers) {
      const sup = allSuppliers.find((s) => s._id === ing.supplierId);
      setEditContact(sup?.preferredContact ?? "phone");
      setEditTemplate(sup?.orderMessageTemplate ?? "");
    } else {
      setEditContact("phone");
      setEditTemplate("");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!(parseFloat(editPar) > 0) || !(parseFloat(editReorder) > 0)) {
      return Alert.alert("Error", "Par level and reorder quantity must be greater than 0");
    }
    try {
      await updateIngredient({
        id: editing as any,
        parLevel: parseFloat(editPar) || 0,
        reorderQty: parseFloat(editReorder) || 0,
        shelfLifeDays: editShelfLife ? parseFloat(editShelfLife) : 0,
      });
      // Save supplier preferred contact + message template
      const ing = ingredients?.find((i) => i._id === editing);
      if (ing?.supplierId) {
        await updateSupplier({
          id: ing.supplierId,
          preferredContact: editContact as any,
          orderMessageTemplate: editTemplate || undefined,
        });
      }
      setEditing(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to save");
    }
  };

  // Sort: critical first
  const sorted = [...(ingredients ?? [])].sort((a, b) => {
    const aRatio = a.parLevel > 0 ? a.currentStock / a.parLevel : 999;
    const bRatio = b.parLevel > 0 ? b.currentStock / b.parLevel : 999;
    return aRatio - bRatio;
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionDescription}>
        Tap any ingredient to edit its par level, reorder quantity, and shelf life.
        The system triggers reorders when stock falls below par or nears expiry.
      </Text>
      {sorted.map((ing) => {
        const color = getStockColor(ing.currentStock, ing.parLevel);
        const isEditing = editing === ing._id;
        const daysToExpiry = ing.expiryDate
          ? Math.ceil((ing.expiryDate - Date.now()) / (24 * 60 * 60 * 1000))
          : null;
        return (
          <TouchableOpacity
            key={ing._id}
            style={[styles.thresholdRow, isEditing && styles.thresholdRowEditing]}
            onPress={() => !isEditing && startEdit(ing)}
            activeOpacity={isEditing ? 1 : 0.7}
          >
            <View style={styles.thresholdLeft}>
              <View style={[styles.stockDot, { backgroundColor: color }]} />
              <View>
                <Text style={styles.thresholdName}>{ing.name}</Text>
                <Text style={styles.thresholdSub}>
                  Stock: {ing.currentStock} {ing.unit}
                  {daysToExpiry !== null && daysToExpiry <= 3
                    ? ` | Expires in ${daysToExpiry}d`
                    : ""}
                  {ing.shelfLifeDays ? ` | Shelf: ${ing.shelfLifeDays}d` : ""}
                </Text>
              </View>
            </View>
            {isEditing ? (
              <View style={styles.editColumn}>
                <View style={styles.editRow}>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Par Level</Text>
                    <TextInput style={styles.editInput} value={editPar} onChangeText={setEditPar} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Min Order</Text>
                    <TextInput style={styles.editInput} value={editReorder} onChangeText={setEditReorder} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Shelf (days)</Text>
                    <TextInput style={styles.editInput} value={editShelfLife} onChangeText={setEditShelfLife} keyboardType="number-pad" placeholder="-" placeholderTextColor="#9CA3AF" />
                  </View>
                </View>
                {ing.supplierId && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.editLabel}>Contact supplier via</Text>
                    <View style={styles.contactMethodRow}>
                      {CONTACT_METHODS.map((m) => (
                        <TouchableOpacity
                          key={m.key}
                          style={[
                            styles.contactMethodBtn,
                            editContact === m.key && styles.contactMethodBtnActive,
                          ]}
                          onPress={() => setEditContact(m.key)}
                        >
                          <Text style={[
                            styles.contactMethodText,
                            editContact === m.key && styles.contactMethodTextActive,
                          ]}>{m.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={[styles.editLabel, { marginTop: 10 }]}>Order message template</Text>
                    <TextInput
                      style={styles.templateInput}
                      value={editTemplate}
                      onChangeText={setEditTemplate}
                      multiline
                      numberOfLines={3}
                      placeholder="Hi, we need {qty} {unit} of {ingredient}. Thank you."
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.templateHint}>
                      The order quantity and ingredient name are added automatically
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={saveEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: "#6B7280" }]} onPress={() => setEditing(null)}>
                    <Text style={styles.saveBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.thresholdRight}>
                <Text style={styles.thresholdVal}>Par: {ing.parLevel}</Text>
                <Text style={styles.thresholdVal}>Reorder: {ing.reorderQty}</Text>
                {ing.shelfLifeDays ? <Text style={styles.thresholdVal}>Shelf: {ing.shelfLifeDays}d</Text> : null}
                {(() => {
                  const sup = ing.supplierId ? allSuppliers?.find((s) => s._id === ing.supplierId) : null;
                  if (!sup) return null;
                  const method = sup.preferredContact ?? "phone";
                  const label = CONTACT_METHODS.find((m) => m.key === method)?.label ?? method;
                  return <Text style={styles.thresholdVal}>{sup.name} ({label})</Text>;
                })()}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// SECTION 4: System Settings
// ═══════════════════════════════════════════
function SystemSection() {
  const settings = useQuery(api.im_settings.getStockLevelSettings);
  const setSetting = useMutation(api.im_settings.set);

  const [criticalPct, setCriticalPct] = useState<string | null>(null);
  const [alpha, setAlpha] = useState<string | null>(null);

  // Init from server values
  React.useEffect(() => {
    if (settings && criticalPct === null) {
      setCriticalPct(String(Math.round(settings.criticalPct * 100)));
      setAlpha(String(settings.alpha));
    }
  }, [settings]);

  const saveCritical = async () => {
    const val = parseFloat(criticalPct ?? "40") / 100;
    if (val > 0 && val < 1) {
      try {
        await setSetting({ key: "criticalStockPct", value: JSON.stringify(val) });
        Alert.alert("Saved", `Critical threshold set to ${Math.round(val * 100)}%`);
      } catch (err: any) {
        Alert.alert("Error", err?.message ?? "Failed to save critical threshold");
      }
    }
  };

  const saveAlpha = async () => {
    const val = parseFloat(alpha ?? "0.4");
    if (val > 0 && val <= 1) {
      try {
        await setSetting({ key: "alpha", value: JSON.stringify(val) });
        Alert.alert("Saved", `EWMA alpha set to ${val}`);
      } catch (err: any) {
        Alert.alert("Error", err?.message ?? "Failed to save alpha");
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Critical Stock % */}
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Critical Stock Level</Text>
        <Text style={styles.settingDesc}>
          When stock falls below this % of par level, the system auto-approves a reorder (urgent).
        </Text>
        <View style={styles.settingRow}>
          <TextInput
            style={[styles.settingInput, { flex: 1 }]}
            value={criticalPct ?? ""}
            onChangeText={setCriticalPct}
            keyboardType="number-pad"
            placeholder="40"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.settingUnit}>%</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={saveCritical}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.levelPreview}>
          <View style={styles.levelBar}>
            <View style={[styles.levelSegment, { flex: parseFloat(criticalPct || "40"), backgroundColor: DashboardColors.stock.critical }]} />
            <View style={[styles.levelSegment, { flex: 100 - parseFloat(criticalPct || "40"), backgroundColor: DashboardColors.stock.warning }]} />
          </View>
          <View style={styles.levelLabels}>
            <Text style={[styles.levelLabel, { color: DashboardColors.stock.critical }]}>Critical (auto-order)</Text>
            <Text style={[styles.levelLabel, { color: DashboardColors.stock.warning }]}>Low (suggest)</Text>
            <Text style={[styles.levelLabel, { color: DashboardColors.stock.healthy }]}>Normal</Text>
          </View>
        </View>
      </View>

      {/* EWMA Alpha */}
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Demand Learning Speed</Text>
        <Text style={styles.settingDesc}>
          How fast the system adapts to real sales data (0.1 = slow/stable, 0.6 = fast/reactive). Default: 0.4 (~4 weeks to converge).
        </Text>
        <View style={styles.settingRow}>
          <TextInput
            style={[styles.settingInput, { flex: 1 }]}
            value={alpha ?? ""}
            onChangeText={setAlpha}
            keyboardType="decimal-pad"
            placeholder="0.4"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveAlpha}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Name */}
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Restaurant</Text>
        <Text style={styles.settingDesc}>{settings?.restaurantName ?? "Loading..."}</Text>
      </View>
    </ScrollView>
  );
}

// ─── Helper Components ───
function CountBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.countBadge, { borderColor: color }]}>
      <Text style={[styles.countNum, { color }]}>{count}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionBar: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 10, gap: 6 },
  sectionPill: { flex: 1, minHeight: 40, maxHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: "#E5E7EB" },
  sectionPillActive: { backgroundColor: "#3B82F6" },
  sectionText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  sectionTextActive: { color: "#fff" },
  sectionDescription: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  // Counts
  countRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  countBadge: { flex: 1, borderWidth: 2, borderRadius: 12, padding: 12, alignItems: "center", backgroundColor: "#fff" },
  countNum: { fontSize: 28, fontWeight: "800" },
  countLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  // Manual reorder
  manualBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#3B82F6", borderRadius: 12, padding: 14, marginBottom: 16, justifyContent: "center" },
  manualBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  // Reorder cards
  reorderCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  reorderCardUrgent: { borderLeftWidth: 4, borderLeftColor: "#DC2626", backgroundColor: "#FEF2F2" },
  contactFullBtn: { marginTop: 10, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  contactBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  reorderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reorderName: { fontSize: 16, fontWeight: "700", color: "#11181C" },
  reorderDetail: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "700" },
  reorderActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  // Threshold rows
  thresholdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  thresholdRowEditing: { borderColor: "#3B82F6", borderWidth: 2 },
  thresholdLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  stockDot: { width: 12, height: 12, borderRadius: 6 },
  thresholdName: { fontSize: 15, fontWeight: "600", color: "#11181C" },
  thresholdSub: { fontSize: 13, color: "#6B7280" },
  thresholdRight: { alignItems: "flex-end" },
  thresholdVal: { fontSize: 13, color: "#374151", fontWeight: "500" },
  editColumn: { flex: 1 },
  contactMethodRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  contactMethodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  contactMethodBtnActive: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  contactMethodText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  contactMethodTextActive: { color: "#3B82F6" },
  templateInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#11181C", minHeight: 70, textAlignVertical: "top", marginTop: 4 },
  templateHint: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editField: { alignItems: "center" },
  editLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", marginBottom: 4 },
  editInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 70, textAlign: "center", fontSize: 15, color: "#11181C" },
  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  // Settings cards
  settingCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  settingTitle: { fontSize: 17, fontWeight: "700", color: "#11181C", marginBottom: 4 },
  settingDesc: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, fontWeight: "600", color: "#11181C" },
  settingUnit: { fontSize: 18, fontWeight: "600", color: "#6B7280" },
  // Level preview
  levelPreview: { marginTop: 14 },
  levelBar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" },
  levelSegment: { height: 12 },
  levelLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  levelLabel: { fontSize: 11, fontWeight: "600" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: 340, maxHeight: "70%" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#11181C", marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: "#11181C" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  ingredientPicker: { maxHeight: 180, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10 },
  pickItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  pickItemActive: { backgroundColor: "#3B82F6" },
  pickText: { fontSize: 14, color: "#374151" },
  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 16, paddingVertical: 40 },
});
