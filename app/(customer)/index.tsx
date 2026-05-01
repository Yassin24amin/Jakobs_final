import React from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ZineText } from '@/components/zine-text';
import { ZineView } from '@/components/zine-view';
import { Rule } from '@/components/rule';
import { MenuMasthead } from '@/components/menu/menu-masthead';
import { CategorySection } from '@/components/menu/category-section';
import { HorizontalScrollSection } from '@/components/menu/horizontal-scroll-section';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

export default function MenuScreen() {
  const menuItems = useQuery(api.menu.list);

  if (menuItems === undefined) {
    return (
      <ZineView style={styles.loading}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </ZineView>
    );
  }

  // Group items by category
  const shawarma = menuItems.filter((i) => i.category === 'shawarma');
  const doner = menuItems.filter((i) => i.category === 'doner');
  const pizza = menuItems.filter((i) => i.category === 'pizza');
  const sides = menuItems.filter((i) => i.category === 'sides');
  const drinks = menuItems.filter((i) => i.category === 'drinks');
  const extras = menuItems.filter((i) => i.category === 'extras');

  return (
    <ZineView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MenuMasthead />

        <View style={styles.sections}>
          {shawarma.length > 0 && (
            <CategorySection
              sectionNumber="01"
              title="SHAWARMA"
              items={shawarma}
            />
          )}

          {doner.length > 0 && (
            <CategorySection
              sectionNumber="02"
              title="DONER"
              items={doner}
            />
          )}

          {pizza.length > 0 && (
            <CategorySection
              sectionNumber="03"
              title="PIZZA"
              items={pizza}
            />
          )}

          {sides.length > 0 && (
            <HorizontalScrollSection
              sectionNumber="04"
              title="SIDES"
              items={sides}
            />
          )}

          {drinks.length > 0 && (
            <HorizontalScrollSection
              sectionNumber="05"
              title="DRINKS"
              items={drinks}
            />
          )}

          {extras.length > 0 && (
            <HorizontalScrollSection
              sectionNumber="06"
              title="EXTRAS"
              items={extras}
            />
          )}
        </View>

        {/* End of menu closer */}
        <View style={styles.closer}>
          <Rule variant="ascii" />
          <ZineText variant="display" style={styles.endText}>
            END OF MENU
          </ZineText>
          <Rule variant="double" />
          <ZineText variant="mono" style={styles.colophon}>
            FRESH DAILY {'\u00B7'} HANDMADE WITH LOVE
          </ZineText>
          <ZineText variant="mono" style={styles.colophon}>
            {'\u00A9'} JAKOB'S {new Date().getFullYear()}
          </ZineText>
        </View>
      </ScrollView>
    </ZineView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  sections: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xl,
  },
  closer: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  endText: {
    textAlign: 'center',
    color: Colors.faint,
    fontSize: FontSizes.xxxl,
  },
  colophon: {
    textAlign: 'center',
    color: Colors.faint,
    fontSize: FontSizes.xs,
  },
});
