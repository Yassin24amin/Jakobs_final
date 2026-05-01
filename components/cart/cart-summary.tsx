import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

interface CartSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export function CartSummary({ subtotal, deliveryFee, total }: CartSummaryProps) {
  return (
    <View style={styles.container}>
      <Rule variant="double" />

      <View style={styles.row}>
        <ZineText variant="mono" style={styles.label}>SUBTOTAL</ZineText>
        <ZineText variant="mono" style={styles.value}>
          {'\u20AC'}{(subtotal / 100).toFixed(2)}
        </ZineText>
      </View>

      <View style={styles.row}>
        <ZineText variant="mono" style={styles.label}>DELIVERY</ZineText>
        <ZineText variant="mono" style={styles.value}>
          {deliveryFee === 0 ? 'FREE' : `\u20AC${(deliveryFee / 100).toFixed(2)}`}
        </ZineText>
      </View>

      <Rule variant="single" />

      <View style={styles.row}>
        <ZineText variant="mono" style={styles.totalLabel}>TOTAL</ZineText>
        <ZineText variant="mono" style={styles.totalValue}>
          {'\u20AC'}{(total / 100).toFixed(2)}
        </ZineText>
      </View>

      <Rule variant="double" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  label: {
    color: Colors.faint,
    fontSize: FontSizes.sm,
  },
  value: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
  },
  totalLabel: {
    color: Colors.primary,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.mono,
  },
  totalValue: {
    color: Colors.accent,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.mono,
  },
});
