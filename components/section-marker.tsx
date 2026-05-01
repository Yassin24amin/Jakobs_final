import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';
import { Rule } from '@/components/rule';

interface SectionMarkerProps {
  number: string;
  title: string;
}

export function SectionMarker({ number, title }: SectionMarkerProps) {
  return (
    <View style={styles.container}>
      <Rule variant="double" />
      <View style={styles.row}>
        <Text style={styles.prefix}>{'\u00A7'} </Text>
        <Text style={styles.number}>{number}</Text>
        <Text style={styles.dash}> {'\u2014'} </Text>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
      </View>
      <Rule variant="double" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  prefix: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
  },
  number: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxl,
    color: Colors.accent,
  },
  dash: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xxl,
    color: Colors.faint,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
});
