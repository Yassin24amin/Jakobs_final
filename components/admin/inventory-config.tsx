import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Fonts, FontSizes, Spacing, getStockColor } from '@/constants/theme';

type ConfigSection = 'reorders' | 'ingredients' | 'system';

const REORDER_STATUS_COLORS: Record<string, string> = {
  suggested: Colors.statusPending,
  approved: Colors.statusConfirmed,
  ordered: '#8B5CF6',
  received: Colors.stockHealthy,
  dismissed: Colors.faint,
};

const CONTACT_METHODS = [
  { key: 'phone', label: 'CALL' },
  { key: 'whatsapp', label: 'WHATSAPP' },
  { key: 'email', label: 'EMAIL' },
] as const;

export function InventoryConfig() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('reorders');

  return (
    <View style={styles.container}>
      {/* Section Pills */}
      <View style={styles.sectionBar}>
        {([
          { key: 'reorders' as const, label: 'REORDERS' },
          { key: 'ingredients' as const, label: 'INGREDIENTS' },
          { key: 'system' as const, label: 'SYSTEM' },
        ]).map((s) => (
          <Pressable
            key={s.key}
            style={[styles.sectionPill, activeSection === s.key && styles.sectionPillActive]}
            onPress={() => setActiveSection(s.key)}
          >
            <Text style={[styles.sectionText, activeSection === s.key && styles.sectionTextActive]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeSection === 'reorders' && <ReorderSection />}
      {activeSection === 'ingredients' && <ThresholdSection />}
      {activeSection === 'system' && <SystemSection />}
    </View>
  );
}

// ═══════════════════════════════════════════
// REORDER MANAGEMENT
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
  const ingredientsList = useQuery(api.im_ingredients.list);
  const createManual = useMutation(api.im_reorders.createManual);
  const [manualIngId, setManualIngId] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState('');

  const handleManualCreate = async () => {
    const qty = parseFloat(manualQty);
    if (!manualIngId || isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Select an ingredient and enter a valid quantity');
      return;
    }
    try {
      await createManual({ ingredientId: manualIngId as Id<'im_ingredients'>, quantity: qty });
      setShowManual(false);
      setManualIngId(null);
      setManualQty('');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create reorder');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Status Counts */}
      {counts && (
        <View style={styles.countRow}>
          <CountBadge label="SUGGESTED" count={counts.suggested} color={Colors.statusPending} />
          <CountBadge label="APPROVED" count={counts.approved} color={Colors.statusConfirmed} />
          <CountBadge label="ORDERED" count={counts.ordered} color="#8B5CF6" />
        </View>
      )}

      {/* Manual Reorder Button */}
      <Pressable style={styles.manualBtn} onPress={() => setShowManual(true)}>
        <Text style={styles.manualBtnText}>+ MANUAL REORDER</Text>
      </Pressable>

      {/* Reorder List */}
      {pending?.map((r) => {
        const statusColor = REORDER_STATUS_COLORS[r.status] ?? Colors.faint;
        const isUrgent = r.trigger === 'critical' || r.trigger === 'expiry';

        return (
          <View
            key={r._id}
            style={[styles.reorderCard, isUrgent && styles.reorderCardUrgent]}
          >
            <View style={styles.reorderHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reorderName}>{r.ingredientName}</Text>
                <Text style={styles.reorderDetail}>
                  {r.quantity} {r.unit}
                  {r.supplierName ? ` \u00B7 ${r.supplierName}` : ''}
                </Text>
              </View>
              <View style={[styles.statusPill, { borderColor: statusColor }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {isUrgent ? 'URGENT ' : ''}{r.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Reason */}
            {r.reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonBoxText}>{r.reason}</Text>
              </View>
            )}

            {/* Supplier Contact */}
            {r.supplierId && (() => {
              const sup = suppliers?.find((s) => s._id === r.supplierId);
              if (!sup) return null;
              const method = (sup as any).preferredContact ?? (sup.phone ? 'phone' : (sup as any).whatsapp ? 'whatsapp' : 'email');
              const buildMsg = () => {
                const orderLine = `\n\nOrder: ${r.quantity} ${r.unit} of ${r.ingredientName}`;
                if ((sup as any).orderMessageTemplate) {
                  return (sup as any).orderMessageTemplate + orderLine;
                }
                return `Hi, this is Jakob's Kitchen.${orderLine}\n\nPlease confirm. Thank you.`;
              };
              const onContact = () => {
                const msg = buildMsg();
                if (method === 'whatsapp' && (sup as any).whatsapp) {
                  const num = (sup as any).whatsapp.replace(/[^0-9]/g, '');
                  Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
                } else if (method === 'email' && sup.email) {
                  const subject = encodeURIComponent(`Order: ${r.ingredientName}`);
                  Linking.openURL(`mailto:${sup.email}?subject=${subject}&body=${encodeURIComponent(msg)}`);
                } else if (sup.phone) {
                  Linking.openURL(`tel:${sup.phone}`);
                }
              };
              const label = method === 'whatsapp' ? 'WHATSAPP' : method === 'email' ? 'EMAIL' : 'CALL';
              return (
                <Pressable style={styles.contactBtn} onPress={onContact}>
                  <Text style={styles.contactBtnText}>
                    CONTACT {sup.name.toUpperCase()} VIA {label}
                  </Text>
                </Pressable>
              );
            })()}

            {/* Actions */}
            <View style={styles.reorderActions}>
              {r.status === 'suggested' && (
                <>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                    onPress={async () => {
                      try { await approve({ id: r._id }); }
                      catch (err: any) { Alert.alert('Error', err?.message ?? 'Failed'); }
                    }}
                  >
                    <Text style={styles.actionBtnTextDark}>APPROVE</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { borderWidth: 1, borderColor: Colors.faint }]}
                    onPress={async () => {
                      try { await dismiss({ id: r._id }); }
                      catch (err: any) { Alert.alert('Error', err?.message ?? 'Failed'); }
                    }}
                  >
                    <Text style={styles.actionBtnTextLight}>DISMISS</Text>
                  </Pressable>
                </>
              )}
              {r.status === 'approved' && (
                <Pressable
                  style={[styles.actionBtn, { borderWidth: 1, borderColor: '#8B5CF6' }]}
                  onPress={async () => {
                    try { await markOrdered({ id: r._id }); }
                    catch (err: any) { Alert.alert('Error', err?.message ?? 'Failed'); }
                  }}
                >
                  <Text style={[styles.actionBtnTextLight, { color: '#8B5CF6' }]}>MARK ORDERED</Text>
                </Pressable>
              )}
              {r.status === 'ordered' && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
                  onPress={async () => {
                    try { await markReceived({ id: r._id }); }
                    catch (err: any) { Alert.alert('Error', err?.message ?? 'Failed'); }
                  }}
                >
                  <Text style={styles.actionBtnTextDark}>MARK RECEIVED</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {(!pending || pending.length === 0) && (
        <Text style={styles.emptyText}>NO PENDING REORDERS</Text>
      )}

      {/* Manual Reorder Modal */}
      <Modal visible={showManual} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowManual(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>MANUAL REORDER</Text>
            <Text style={styles.modalLabel}>INGREDIENT</Text>
            <ScrollView style={styles.ingredientPicker} nestedScrollEnabled>
              {ingredientsList?.map((ing) => (
                <Pressable
                  key={ing._id}
                  style={[styles.pickItem, manualIngId === ing._id && styles.pickItemActive]}
                  onPress={() => setManualIngId(ing._id)}
                >
                  <Text style={[styles.pickText, manualIngId === ing._id && { color: Colors.black }]}>
                    {ing.name} ({ing.currentStock} {ing.unit})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>QUANTITY</Text>
            <TextInput
              style={styles.modalInput}
              value={manualQty}
              onChangeText={setManualQty}
              keyboardType="decimal-pad"
              placeholder="AMOUNT TO ORDER"
              placeholderTextColor={Colors.faint}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.actionBtn, { flex: 1, borderWidth: 1, borderColor: Colors.rule }]}
                onPress={() => setShowManual(false)}
              >
                <Text style={styles.actionBtnTextLight}>CANCEL</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  { flex: 1, backgroundColor: Colors.accent, opacity: manualIngId && manualQty ? 1 : 0.4 },
                ]}
                onPress={handleManualCreate}
                disabled={!manualIngId || !manualQty}
              >
                <Text style={styles.actionBtnTextDark}>CREATE</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
// INGREDIENT THRESHOLDS
// ═══════════════════════════════════════════
function ThresholdSection() {
  const ingredients = useQuery(api.im_ingredients.list);
  const allSuppliers = useQuery(api.im_suppliers.list);
  const updateThresholds = useMutation(api.im_reorders.updateThresholds);
  const updateIngredient = useMutation(api.im_ingredients.update);
  const updateSupplier = useMutation(api.im_suppliers.update);

  const [editing, setEditing] = useState<string | null>(null);
  const [editPar, setEditPar] = useState('');
  const [editReorder, setEditReorder] = useState('');
  const [editShelfLife, setEditShelfLife] = useState('');
  const [editContact, setEditContact] = useState<string>('phone');
  const [editTemplate, setEditTemplate] = useState('');

  const startEdit = (ing: any) => {
    setEditing(ing._id);
    setEditPar(String(ing.parLevel));
    setEditReorder(String(ing.reorderQty));
    setEditShelfLife(ing.shelfLifeDays ? String(ing.shelfLifeDays) : '');
    if (ing.supplierId && allSuppliers) {
      const sup = allSuppliers.find((s) => s._id === ing.supplierId);
      setEditContact((sup as any)?.preferredContact ?? 'phone');
      setEditTemplate((sup as any)?.orderMessageTemplate ?? '');
    } else {
      setEditContact('phone');
      setEditTemplate('');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!(parseFloat(editPar) > 0) || !(parseFloat(editReorder) > 0)) {
      Alert.alert('Error', 'Par level and reorder quantity must be greater than 0');
      return;
    }
    try {
      await updateThresholds({
        ingredientId: editing as Id<'im_ingredients'>,
        parLevel: parseFloat(editPar) || 0,
        reorderQty: parseFloat(editReorder) || 0,
      });
      const shelfDays = parseFloat(editShelfLife);
      if (shelfDays > 0) {
        await updateIngredient({
          id: editing as Id<'im_ingredients'>,
          shelfLifeDays: shelfDays,
        });
      }
      // Save supplier preferred contact + message template
      const ing = ingredients?.find((i) => i._id === editing);
      if (ing?.supplierId) {
        await updateSupplier({
          id: ing.supplierId,
          preferredContact: editContact as any,
          ...(editTemplate ? { orderMessageTemplate: editTemplate } : {}),
        });
      }
      setEditing(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save');
    }
  };

  const sorted = [...(ingredients ?? [])].sort((a, b) => {
    const aRatio = a.parLevel > 0 ? a.currentStock / a.parLevel : 999;
    const bRatio = b.parLevel > 0 ? b.currentStock / b.parLevel : 999;
    return aRatio - bRatio;
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.descText}>
        Tap any ingredient to edit par level, reorder qty, and shelf life.
        Reorders trigger when stock falls below par or nears expiry.
      </Text>

      {sorted.map((ing) => {
        const color = getStockColor(ing.currentStock, ing.parLevel);
        const isEditing = editing === ing._id;
        const daysToExpiry = ing.expiryDate
          ? Math.ceil((ing.expiryDate - Date.now()) / (24 * 60 * 60 * 1000))
          : null;

        return (
          <Pressable
            key={ing._id}
            style={[styles.thresholdRow, isEditing && styles.thresholdRowEditing]}
            onPress={() => !isEditing && startEdit(ing)}
          >
            <View style={styles.thresholdTop}>
              <View style={[styles.stockDot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.thresholdName}>{ing.name}</Text>
                <Text style={styles.thresholdSub}>
                  {ing.currentStock} {ing.unit}
                  {daysToExpiry !== null && daysToExpiry <= 3 ? ` \u00B7 EXPIRES ${daysToExpiry}D` : ''}
                  {ing.shelfLifeDays ? ` \u00B7 SHELF ${ing.shelfLifeDays}D` : ''}
                </Text>
              </View>
              {!isEditing && (
                <View style={styles.thresholdRight}>
                  <Text style={styles.thresholdVal}>PAR: {ing.parLevel}</Text>
                  <Text style={styles.thresholdVal}>REORDER: {ing.reorderQty}</Text>
                </View>
              )}
            </View>

            {isEditing && (
              <View style={styles.editSection}>
                <View style={styles.editRow}>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>PAR LEVEL</Text>
                    <TextInput style={styles.editInput} value={editPar} onChangeText={setEditPar} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>MIN ORDER</Text>
                    <TextInput style={styles.editInput} value={editReorder} onChangeText={setEditReorder} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>SHELF (D)</Text>
                    <TextInput style={styles.editInput} value={editShelfLife} onChangeText={setEditShelfLife} keyboardType="number-pad" placeholder="-" placeholderTextColor={Colors.faint} />
                  </View>
                </View>

                {ing.supplierId && (
                  <View style={{ marginTop: Spacing.sm }}>
                    <Text style={styles.editLabel}>CONTACT VIA</Text>
                    <View style={styles.contactMethodRow}>
                      {CONTACT_METHODS.map((m) => (
                        <Pressable
                          key={m.key}
                          style={[styles.contactMethodBtn, editContact === m.key && styles.contactMethodBtnActive]}
                          onPress={() => setEditContact(m.key)}
                        >
                          <Text style={[styles.contactMethodText, editContact === m.key && styles.contactMethodTextActive]}>
                            {m.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={[styles.editLabel, { marginTop: Spacing.sm }]}>ORDER TEMPLATE</Text>
                    <TextInput
                      style={styles.templateInput}
                      value={editTemplate}
                      onChangeText={setEditTemplate}
                      multiline
                      numberOfLines={3}
                      placeholder="Hi, we need..."
                      placeholderTextColor={Colors.faint}
                    />
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                  <Pressable style={[styles.saveBtn, { flex: 1 }]} onPress={saveEdit}>
                    <Text style={styles.saveBtnText}>SAVE</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.rule }]} onPress={() => setEditing(null)}>
                    <Text style={[styles.saveBtnText, { color: Colors.faint }]}>CANCEL</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
// SYSTEM SETTINGS
// ═══════════════════════════════════════════
function SystemSection() {
  const settings = useQuery(api.im_settings.getStockLevelSettings);
  const setSetting = useMutation(api.im_settings.set);

  const [criticalPct, setCriticalPct] = useState<string | null>(null);
  const [alpha, setAlpha] = useState<string | null>(null);

  useEffect(() => {
    if (settings && criticalPct === null) {
      setCriticalPct(String(Math.round(settings.criticalPct * 100)));
      setAlpha(String(settings.alpha));
    }
  }, [settings]);

  const saveCritical = async () => {
    const val = parseFloat(criticalPct ?? '40') / 100;
    if (val > 0 && val < 1) {
      try {
        await setSetting({ key: 'criticalStockPct', value: JSON.stringify(val) });
        Alert.alert('Saved', `Critical threshold set to ${Math.round(val * 100)}%`);
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to save');
      }
    }
  };

  const saveAlpha = async () => {
    const val = parseFloat(alpha ?? '0.4');
    if (val > 0 && val <= 1) {
      try {
        await setSetting({ key: 'alpha', value: JSON.stringify(val) });
        Alert.alert('Saved', `EWMA alpha set to ${val}`);
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to save');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Critical Stock % */}
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>CRITICAL STOCK LEVEL</Text>
        <Text style={styles.settingDesc}>
          When stock falls below this % of par level, the system auto-orders (urgent).
        </Text>
        <View style={styles.settingRow}>
          <TextInput
            style={[styles.settingInput, { flex: 1 }]}
            value={criticalPct ?? ''}
            onChangeText={setCriticalPct}
            keyboardType="number-pad"
            placeholder="40"
            placeholderTextColor={Colors.faint}
          />
          <Text style={styles.settingUnit}>%</Text>
          <Pressable style={styles.saveBtn} onPress={saveCritical}>
            <Text style={styles.saveBtnText}>SAVE</Text>
          </Pressable>
        </View>
        {/* Level Preview Bar */}
        <View style={styles.levelPreview}>
          <View style={styles.levelBar}>
            <View style={[styles.levelSegment, { flex: parseFloat(criticalPct || '40'), backgroundColor: Colors.stockCritical }]} />
            <View style={[styles.levelSegment, { flex: 100 - parseFloat(criticalPct || '40'), backgroundColor: Colors.stockWarning }]} />
          </View>
          <View style={styles.levelLabels}>
            <Text style={[styles.levelLabel, { color: Colors.stockCritical }]}>CRITICAL</Text>
            <Text style={[styles.levelLabel, { color: Colors.stockWarning }]}>LOW</Text>
            <Text style={[styles.levelLabel, { color: Colors.stockHealthy }]}>NORMAL</Text>
          </View>
        </View>
      </View>

      {/* EWMA Alpha */}
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>DEMAND LEARNING SPEED</Text>
        <Text style={styles.settingDesc}>
          How fast the system adapts to real sales (0.1 = slow, 0.6 = fast). Default: 0.4.
        </Text>
        <View style={styles.settingRow}>
          <TextInput
            style={[styles.settingInput, { flex: 1 }]}
            value={alpha ?? ''}
            onChangeText={setAlpha}
            keyboardType="decimal-pad"
            placeholder="0.4"
            placeholderTextColor={Colors.faint}
          />
          <Pressable style={styles.saveBtn} onPress={saveAlpha}>
            <Text style={styles.saveBtnText}>SAVE</Text>
          </Pressable>
        </View>
      </View>

      {/* Restaurant Name */}
      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>RESTAURANT</Text>
        <Text style={styles.settingValue}>{settings?.restaurantName ?? 'LOADING...'}</Text>
      </View>
    </ScrollView>
  );
}

// ─── Helper ───
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  // Section Pills
  sectionBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  sectionPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
  },
  sectionPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  sectionText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
    fontWeight: '700',
  },
  sectionTextActive: {
    color: Colors.black,
  },
  // Counts
  countRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  countBadge: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 0,
    padding: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  countNum: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  },
  countLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
    marginTop: 2,
  },
  // Manual Reorder
  manualBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  manualBtnText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Reorder Cards
  reorderCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reorderCardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.stockCritical,
  },
  reorderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reorderName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  reorderDetail: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginTop: 2,
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 0,
  },
  statusText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  reasonBox: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  reasonBoxText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  // Contact
  contactBtn: {
    backgroundColor: Colors.statusConfirmed,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderRadius: 0,
  },
  contactBtnText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Actions
  reorderActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    borderRadius: 0,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  actionBtnTextDark: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  actionBtnTextLight: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Threshold Section
  descText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  thresholdRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  thresholdRowEditing: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  thresholdTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 0,
  },
  thresholdName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  thresholdSub: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 0.5,
  },
  thresholdRight: {
    alignItems: 'flex-end',
  },
  thresholdVal: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  editSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
  },
  editRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editField: {
    flex: 1,
  },
  editLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  contactMethodRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  contactMethodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
  },
  contactMethodBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  contactMethodText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    fontWeight: '700',
    letterSpacing: 1,
  },
  contactMethodTextActive: {
    color: Colors.black,
  },
  templateInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 0,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // System Settings
  settingCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  settingDesc: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
  },
  settingUnit: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.faint,
    fontWeight: '700',
  },
  settingValue: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  // Level Preview
  levelPreview: {
    marginTop: Spacing.md,
  },
  levelBar: {
    flexDirection: 'row',
    height: 8,
    overflow: 'hidden',
  },
  levelSegment: {
    height: 8,
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  levelLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Empty
  emptyText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.faint,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
    letterSpacing: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.lg,
    width: Math.min(340, Dimensions.get('window').width * 0.9),
    maxHeight: '70%',
  },
  modalTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  ingredientPicker: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  pickItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.rule,
  },
  pickItemActive: {
    backgroundColor: Colors.accent,
  },
  pickText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});
