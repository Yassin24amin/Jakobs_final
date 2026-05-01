import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type BadgeType = 'tag' | 'signature' | 'hot';

interface BadgeProps {
  type: BadgeType;
  label: string;
}

export function Badge({ type, label }: BadgeProps) {
  if (type === 'signature') {
    return (
      <View style={styles.signatureContainer}>
        <Text style={styles.signatureText}>
          {'\u2605'} {label.toUpperCase()}
        </Text>
      </View>
    );
  }

  if (type === 'hot') {
    return (
      <View style={styles.hotContainer}>
        <Text style={styles.hotText}>
          {'\u25B2'} {label.toUpperCase()}
        </Text>
      </View>
    );
  }

  // tag
  return (
    <View style={styles.tagContainer}>
      <Text style={styles.tagText}>
        [{label.toUpperCase()}]
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tagContainer: {
    alignSelf: 'flex-start',
  },
  tagText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
  signatureContainer: {
    alignSelf: 'flex-start',
  },
  signatureText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.accentYellow,
  },
  hotContainer: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 0,
  },
  hotText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.accent,
  },
});
