import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ZineText } from '@/components/zine-text';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

interface TickerTapeProps {
  items: Array<{ name: string; price: number }>;
}

function formatPrice(cents: number): string {
  const euros = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, '0');
  return `\u20AC${euros}.${remainder}`;
}

export function TickerTape({ items }: TickerTapeProps) {
  if (items.length === 0) return null;

  const tickerContent = items
    .map((item) => `${item.name.toUpperCase()} ${formatPrice(item.price)}`)
    .join('  \u00B7  ');

  return (
    <View style={styles.container}>
      <View style={styles.hotLabel}>
        <ZineText variant="mono" style={styles.hotText}>
          HOT
        </ZineText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ZineText variant="mono" style={styles.tickerText}>
          {tickerContent}
        </ZineText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.md,
  },
  hotLabel: {
    paddingHorizontal: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.black,
  },
  hotText: {
    color: Colors.black,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  tickerText: {
    color: Colors.black,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
  },
});
