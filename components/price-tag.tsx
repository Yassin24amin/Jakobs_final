import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors, Fonts, FontSizes } from '@/constants/theme';

interface PriceTagProps {
  amount: number; // cents
}

export function PriceTag({ amount }: PriceTagProps) {
  const euros = Math.floor(amount / 100);
  const cents = String(amount % 100).padStart(2, '0');

  return (
    <Text style={styles.price}>
      {'\u20AC'}{euros}.{cents}
    </Text>
  );
}

const styles = StyleSheet.create({
  price: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
});
