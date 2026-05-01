import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZineText } from '@/components/zine-text';
import { Rule } from '@/components/rule';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

export function MenuMasthead() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <ZineText variant="kicker" style={styles.kicker}>
        EST. 2017  /  DEGGENDORF
      </ZineText>

      <ZineText variant="masthead" style={styles.title}>
        JAKOB'S
      </ZineText>

      <ZineText variant="display" style={styles.subtitle}>
        SHAWARMA  &  DONER
      </ZineText>

      <Rule variant="double" />

      <ZineText variant="mono" style={styles.byline}>
        DEGGENDORF {'\u00B7'} FRESH DAILY {'\u00B7'} HANDMADE
      </ZineText>

      <Rule variant="double" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    // paddingTop applied dynamically via useSafeAreaInsets
    paddingBottom: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  kicker: {
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: FontSizes.mastheadHero,
    letterSpacing: -2,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: FontSizes.subtitle,
    letterSpacing: 4,
  },
  byline: {
    textAlign: 'center',
    color: Colors.faint,
  },
});
