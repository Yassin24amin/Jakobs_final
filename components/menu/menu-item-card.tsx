import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ZineText } from '@/components/zine-text';
import { PriceTag } from '@/components/price-tag';
import { Badge } from '@/components/badge';
import { Rule } from '@/components/rule';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

interface MenuItemCardProps {
  displayIndex: string;
  name: string;
  arabicName?: string;
  description: string;
  price: number;
  tags: string[];
  isSpicy: boolean;
  isSignature: boolean;
  menuItemId: string;
  onAddToCart: () => void;
}

export function MenuItemCard({
  displayIndex,
  name,
  arabicName,
  description,
  price,
  tags,
  isSpicy,
  isSignature,
  onAddToCart,
}: MenuItemCardProps) {
  return (
    <View style={styles.container}>
      {/* Top row: index + price */}
      <View style={styles.topRow}>
        <ZineText variant="mono" style={styles.index}>
          {displayIndex}
        </ZineText>
        <PriceTag amount={price} />
      </View>

      {/* Name */}
      <ZineText variant="display" style={styles.name}>
        {name}
      </ZineText>

      {/* Arabic name */}
      {arabicName ? (
        <ZineText variant="body" style={styles.arabicName}>
          {arabicName}
        </ZineText>
      ) : null}

      {/* Description */}
      <ZineText variant="body" style={styles.description}>
        {description}
      </ZineText>

      {/* Tags row */}
      {(tags.length > 0 || isSignature || isSpicy) && (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <Badge key={tag} type="tag" label={tag} />
          ))}
          {isSignature && <Badge type="signature" label="SIGNATURE" />}
          {isSpicy && <Badge type="hot" label="HOT" />}
        </View>
      )}

      {/* Bottom rule + add button */}
      <View style={styles.bottomRow}>
        <View style={styles.ruleWrapper}>
          <Rule />
        </View>
        <Pressable style={styles.addButton} onPress={onAddToCart}>
          <ZineText variant="mono" style={styles.addButtonText}>
            + ADD
          </ZineText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  index: {
    color: Colors.faint,
  },
  name: {
    fontSize: FontSizes.xxl,
  },
  arabicName: {
    fontFamily: Fonts.body,
    fontStyle: 'normal',
    color: Colors.accentYellow,
    fontSize: FontSizes.md,
  },
  description: {
    color: Colors.faint,
    fontSize: FontSizes.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  ruleWrapper: {
    flex: 1,
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 0,
  },
  addButtonText: {
    color: Colors.black,
    fontSize: FontSizes.xs,
    letterSpacing: 2,
  },
});
