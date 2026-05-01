import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { useCart } from '@/contexts/cart-context';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

interface CartItemProps {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export function CartItem({ menuItemId, name, price, quantity }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();

  const lineTotal = price * quantity;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ZineText variant="sectionHeader" style={styles.name}>{name}</ZineText>
        <ZineText variant="price">{'\u20AC'}{(lineTotal / 100).toFixed(2)}</ZineText>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepperButton}
            onPress={() => updateQuantity(menuItemId, quantity - 1)}
          >
            <ZineText variant="mono" style={styles.stepperButtonText}>-</ZineText>
          </Pressable>

          <View style={styles.quantityDisplay}>
            <ZineText variant="mono" style={styles.quantityText}>{quantity}</ZineText>
          </View>

          <Pressable
            style={styles.stepperButton}
            onPress={() => updateQuantity(menuItemId, quantity + 1)}
          >
            <ZineText variant="mono" style={styles.stepperButtonText}>+</ZineText>
          </Pressable>
        </View>

        <Pressable style={styles.removeButton} onPress={() => removeItem(menuItemId)}>
          <ZineText variant="mono" style={styles.removeText}>REMOVE</ZineText>
        </Pressable>
      </View>

      <Rule variant="single" style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  name: {
    flex: 1,
    marginRight: Spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
  },
  quantityDisplay: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.rule,
  },
  quantityText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
  },
  removeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
  },
  removeText: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
  },
  rule: {
    marginTop: Spacing.md,
  },
});
