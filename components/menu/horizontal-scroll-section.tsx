import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SectionMarker } from '@/components/section-marker';
import { ZineText } from '@/components/zine-text';
import { PriceTag } from '@/components/price-tag';
import { useCart } from '@/contexts/cart-context';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

interface HorizontalScrollSectionProps {
  sectionNumber: string;
  title: string;
  items: Array<{
    _id: string;
    displayIndex: string;
    name: string;
    arabicName?: string;
    description: string;
    price: number;
    tags: string[];
    isSpicy: boolean;
    isSignature: boolean;
  }>;
}

export function HorizontalScrollSection({
  sectionNumber,
  title,
  items,
}: HorizontalScrollSectionProps) {
  const { addItem } = useCart();

  return (
    <View style={styles.container}>
      <SectionMarker number={sectionNumber} title={title} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <View key={item._id} style={styles.card}>
            <ZineText variant="display" style={styles.cardName}>
              {item.name}
            </ZineText>
            <PriceTag amount={item.price} />
            <View style={styles.cardSpacer} />
            <Pressable
              style={styles.addButton}
              onPress={() =>
                addItem({
                  menuItemId: item._id,
                  name: item.name,
                  price: item.price,
                })
              }
            >
              <ZineText variant="mono" style={styles.addButtonText}>
                + ADD
              </ZineText>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  card: {
    width: 160,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: 0,
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.xs,
  },
  cardSpacer: {
    flex: 1,
  },
  addButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 0,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  addButtonText: {
    color: Colors.black,
    fontSize: FontSizes.xs,
    letterSpacing: 2,
  },
});
