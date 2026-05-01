import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { Colors, Fonts, FontSizes } from '@/constants/theme';

type Variant =
  | 'masthead'
  | 'display'
  | 'sectionHeader'
  | 'body'
  | 'mono'
  | 'kicker'
  | 'price'
  | 'tag';

export type ZineTextProps = TextProps & {
  variant?: Variant;
};

export function ZineText({
  variant = 'body',
  style,
  children,
  ...rest
}: ZineTextProps) {
  return (
    <Text style={[styles[variant], style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  masthead: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.masthead,
    letterSpacing: -2,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.display,
    letterSpacing: -1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  sectionHeader: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xxl,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  body: {
    fontFamily: Fonts.body,
    fontStyle: 'italic',
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.faint,
  },
  kicker: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.accent,
  },
  price: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.lg,
    color: Colors.accent,
  },
  tag: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    color: Colors.faint,
  },
});
