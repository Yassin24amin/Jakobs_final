import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SectionMarker } from '@/components/section-marker';
import { MenuItemCard } from '@/components/menu/menu-item-card';
import { useCart } from '@/contexts/cart-context';
import { Spacing } from '@/constants/theme';

interface CategorySectionProps {
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

export function CategorySection({ sectionNumber, title, items }: CategorySectionProps) {
  const { addItem } = useCart();

  return (
    <View style={styles.container}>
      <SectionMarker number={sectionNumber} title={title} />
      <View style={styles.itemsList}>
        {items.map((item) => (
          <MenuItemCard
            key={item._id}
            displayIndex={item.displayIndex}
            name={item.name}
            arabicName={item.arabicName}
            description={item.description}
            price={item.price}
            tags={item.tags}
            isSpicy={item.isSpicy}
            isSignature={item.isSignature}
            menuItemId={item._id}
            onAddToCart={() =>
              addItem({
                menuItemId: item._id,
                name: item.name,
                price: item.price,
              })
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  itemsList: {
    gap: Spacing.xs,
  },
});
