import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Fonts, FontSizes, Spacing, getStockColor } from '@/constants/theme';

export function InventoryStock() {
  const items = useQuery(api.im_ingredients.list);
  const reorderCounts = useQuery(api.im_reorders.statusCounts);
  const adjustStock = useMutation(api.im_ingredients.adjustStock);
  const setStock = useMutation(api.im_ingredients.setStock);

  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Set-exact modal
  const [setModalVisible, setSetModalVisible] = useState(false);
  const [setModalItem, setSetModalItem] = useState<{ id: string; name: string; currentStock: number; unit: string } | null>(null);
  const [setModalValue, setSetModalValue] = useState('');

  const categories = useMemo(() => {
    if (!items) return [{ key: 'all', label: 'ALL' }];
    const seen = new Set<string>();
    const cats: { key: string; label: string }[] = [{ key: 'all', label: 'ALL' }];
    for (const item of items) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        cats.push({
          key: item.category,
          label: item.category.replace(/_/g, ' ').toUpperCase(),
        });
      }
    }
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = [...items];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(lower));
    }
    if (showLowOnly) {
      result = result.filter((i) => i.currentStock <= i.parLevel);
    }
    if (selectedCategory !== 'all') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    // Sort: critical first, then low, then normal
    const getTier = (ratio: number) => (ratio <= 0.4 ? 0 : ratio <= 1.0 ? 1 : 2);
    result.sort((a, b) => {
      const aRatio = a.parLevel > 0 ? a.currentStock / a.parLevel : 999;
      const bRatio = b.parLevel > 0 ? b.currentStock / b.parLevel : 999;
      const tierDiff = getTier(aRatio) - getTier(bRatio);
      return tierDiff !== 0 ? tierDiff : aRatio - bRatio;
    });

    return result;
  }, [items, search, showLowOnly, selectedCategory]);

  const lowStockCount = useMemo(() => {
    if (!items) return 0;
    return items.filter((i) => i.currentStock <= i.parLevel).length;
  }, [items]);

  const handleAdjust = async (id: string, delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await adjustStock({ id: id as Id<'im_ingredients'>, delta });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to adjust stock');
    }
  };

  const openSetModal = (item: any) => {
    setSetModalItem({
      id: item._id,
      name: item.name,
      currentStock: item.currentStock,
      unit: item.unit,
    });
    setSetModalValue(String(item.currentStock));
    setSetModalVisible(true);
  };

  const handleSetQty = async () => {
    if (!setModalItem) return;
    const qty = parseFloat(setModalValue);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Enter a valid quantity');
      return;
    }
    try {
      await setStock({ id: setModalItem.id as Id<'im_ingredients'>, newStock: qty });
      setSetModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to set stock');
    }
  };

  if (items === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Low Stock Banner */}
      {lowStockCount > 0 && (
        <Pressable
          style={styles.alertBanner}
          onPress={() => setShowLowOnly(!showLowOnly)}
        >
          <Text style={styles.alertText}>
            {lowStockCount} INGREDIENT{lowStockCount !== 1 ? 'S' : ''} BELOW PAR
          </Text>
          <Text style={styles.alertAction}>
            {showLowOnly ? 'SHOW ALL' : 'FILTER'}
          </Text>
        </Pressable>
      )}

      {/* Reorder Alert Banner */}
      {reorderCounts && (reorderCounts.suggested > 0 || reorderCounts.ordered > 0) && (
        <View style={styles.reorderBanner}>
          <Text style={styles.reorderText}>
            {reorderCounts.suggested > 0 && `${reorderCounts.suggested} SUGGESTED`}
            {reorderCounts.suggested > 0 && reorderCounts.ordered > 0 && ' \u00B7 '}
            {reorderCounts.ordered > 0 && `${reorderCounts.ordered} ORDERED`}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH INGREDIENTS..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={Colors.faint}
          autoCapitalize="none"
        />
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catBar}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat.key}
            style={[styles.catPill, selectedCategory === cat.key && styles.catPillActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={[styles.catText, selectedCategory === cat.key && styles.catTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Ingredient List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const stockColor = getStockColor(item.currentStock, item.parLevel);
          const ratio = item.parLevel > 0 ? Math.min(item.currentStock / item.parLevel, 1.5) : 1;

          return (
            <Pressable style={styles.itemCard} onLongPress={() => openSetModal(item)}>
              <View style={styles.itemTop}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={[styles.itemStock, { color: stockColor }]}>
                    {item.currentStock} {item.unit}
                  </Text>
                  <Text style={styles.itemMeta}>
                    PAR: {item.parLevel} {item.unit} {'\u00B7'} {item.category.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>

                {/* Quantity Adjuster */}
                <View style={styles.adjuster}>
                  <Pressable
                    style={styles.adjButton}
                    onPress={() => handleAdjust(item._id, -1)}
                    onLongPress={() => openSetModal(item)}
                  >
                    <Text style={styles.adjButtonText}>{'\u2212'}</Text>
                  </Pressable>
                  <Text style={[styles.adjValue, { color: stockColor }]}>
                    {item.currentStock}
                  </Text>
                  <Pressable
                    style={styles.adjButton}
                    onPress={() => handleAdjust(item._id, 1)}
                    onLongPress={() => openSetModal(item)}
                  >
                    <Text style={styles.adjButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Stock Bar */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(ratio * 100 / 1.5, 100)}%`,
                      backgroundColor: stockColor,
                    },
                  ]}
                />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {search ? 'NO INGREDIENTS MATCH' : 'NO INGREDIENTS'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Set Exact Value Modal */}
      <Modal visible={setModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSetModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>SET STOCK</Text>
            {setModalItem && (
              <>
                <Text style={styles.modalSubtitle}>
                  {setModalItem.name} ({setModalItem.unit})
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={setModalValue}
                  onChangeText={setSetModalValue}
                  keyboardType="decimal-pad"
                  autoFocus
                  selectTextOnFocus
                />
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setSetModalVisible(false)}
                  >
                    <Text style={styles.modalButtonCancelText}>CANCEL</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.modalButtonConfirm]} onPress={handleSetQty}>
                    <Text style={styles.modalButtonConfirmText}>SET</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Alert Banners
  alertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.stockCritical,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  alertText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  alertAction: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
    textDecorationLine: 'underline',
  },
  reorderBanner: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  reorderText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.statusPending,
    letterSpacing: 1,
  },
  // Search
  searchRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    letterSpacing: 1,
  },
  // Category Filters
  catBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  catPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
  },
  catPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  catText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  catTextActive: {
    color: Colors.black,
  },
  // Ingredient List
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemName: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  itemStock: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  itemMeta: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  // Adjuster
  adjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  adjButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  adjButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.black,
    fontWeight: '700',
  },
  adjValue: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  // Stock Bar
  barTrack: {
    height: 4,
    backgroundColor: Colors.rule,
    borderRadius: 0,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 0,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.faint,
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
    width: 300,
  },
  modalTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.faint,
    marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 0,
  },
  modalButtonCancel: {
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  modalButtonCancelText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.faint,
    letterSpacing: 1,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.accent,
  },
  modalButtonConfirmText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
