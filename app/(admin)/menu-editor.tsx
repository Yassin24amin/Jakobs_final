import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Text,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

const CATEGORIES = ['shawarma', 'doner', 'pizza', 'sides', 'drinks', 'extras'] as const;
type Category = typeof CATEGORIES[number];

export default function MenuEditorScreen() {
  const insets = useSafeAreaInsets();
  const menuItems = useQuery(api.menu.listAll, {});
  const toggleAvailability = useMutation(api.menu.toggleAvailability);
  const createItem = useMutation(api.menu.create);
  const [showAddModal, setShowAddModal] = useState(false);

  if (menuItems === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleAvailability({ id: id as Id<'menuItems'> });
    } catch {
      // silently fail
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>MENU EDITOR</Text>
        <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ ADD NEW ITEM</Text>
        </Pressable>
      </View>

      {/* Items List */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {CATEGORIES.map((category) => {
          const categoryItems = menuItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.toUpperCase()}</Text>
              {categoryItems.map((item) => (
                <View
                  key={item._id}
                  style={[styles.itemCard, !item.isAvailable && styles.itemCardDimmed]}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, !item.isAvailable && styles.textDimmed]}>
                      {item.name}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemPrice}>
                        {'\u20AC'}{(item.price / 100).toFixed(2)}
                      </Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <Text style={styles.itemIndex}>{item.displayIndex}</Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={styles.availLabel}>
                      {item.isAvailable ? 'ON' : 'OFF'}
                    </Text>
                    <Switch
                      value={item.isAvailable}
                      onValueChange={() => handleToggle(item._id)}
                      trackColor={{ false: Colors.rule, true: Colors.accent }}
                      thumbColor={Colors.primary}
                    />
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Item Modal */}
      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreate={createItem}
        itemCount={menuItems.length}
      />
    </View>
  );
}

function AddItemModal({
  visible,
  onClose,
  onCreate,
  itemCount,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (args: any) => Promise<any>;
  itemCount: number;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('shawarma');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || !price.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    const priceInCents = Math.round(parseFloat(price) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      Alert.alert('Error', 'Please enter a valid price.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        price: priceInCents,
        category,
        tags: [],
        isSpicy: false,
        isSignature: false,
        isAvailable: true,
        sortOrder: itemCount + 1,
        displayIndex: String(itemCount + 1).padStart(3, '0'),
      });
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setCategory('shawarma');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to create item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>ADD NEW ITEM</Text>
            <Pressable onPress={onClose}>
              <Text style={modalStyles.closeText}>CLOSE</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={modalStyles.form}>
            <Text style={modalStyles.label}>NAME</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="item name"
              placeholderTextColor={Colors.faint}
            />

            <Text style={modalStyles.label}>DESCRIPTION</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="item description"
              placeholderTextColor={Colors.faint}
              multiline
            />

            <Text style={modalStyles.label}>PRICE (EUR)</Text>
            <TextInput
              style={modalStyles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={Colors.faint}
              keyboardType="decimal-pad"
            />

            <Text style={modalStyles.label}>CATEGORY</Text>
            <View style={modalStyles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    modalStyles.categoryButton,
                    category === cat && modalStyles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      modalStyles.categoryButtonText,
                      category === cat && modalStyles.categoryButtonTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[modalStyles.submitButton, isSubmitting && modalStyles.submitDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.black} size="small" />
              ) : (
                <Text style={modalStyles.submitText}>CREATE ITEM</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    // paddingTop applied dynamically via useSafeAreaInsets
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xl,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 0,
  },
  addButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 1,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  categorySection: {
    marginBottom: Spacing.lg,
  },
  categoryTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.accent,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  itemCardDimmed: {
    opacity: 0.5,
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
  textDimmed: {
    color: Colors.faint,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  itemPrice: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  itemCategory: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  itemIndex: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  availLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  closeText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    color: Colors.accent,
    letterSpacing: 1,
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 2,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.background,
    color: Colors.primary,
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    padding: Spacing.md,
    borderRadius: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
  },
  categoryButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryButtonText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
    letterSpacing: 1,
  },
  categoryButtonTextActive: {
    color: Colors.black,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    marginTop: Spacing.lg,
    minHeight: 48,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.md,
    color: Colors.black,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
