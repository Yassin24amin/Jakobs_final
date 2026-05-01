import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { Colors, Fonts, FontSizes } from '@/constants/theme';

type RuleVariant = 'single' | 'double' | 'ascii';

export type RuleProps = ViewProps & {
  variant?: RuleVariant;
};

export function Rule({ variant = 'single', style, ...rest }: RuleProps) {
  if (variant === 'ascii') {
    return (
      <View style={[styles.asciiContainer, style]} {...rest}>
        <Text style={styles.asciiText}>
          {'\u25B2\u25BC\u25B2\u25BC\u25B2\u25BC\u25B2\u25BC\u25B2\u25BC\u25B2\u25BC\u25B2\u25BC\u25B2'}
        </Text>
      </View>
    );
  }

  if (variant === 'double') {
    return (
      <View style={[styles.doubleContainer, style]} {...rest}>
        <View style={styles.line} />
        <View style={styles.doubleGap} />
        <View style={styles.line} />
      </View>
    );
  }

  return <View style={[styles.line, style]} {...rest} />;
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    backgroundColor: Colors.rule,
    width: '100%',
  },
  doubleContainer: {
    width: '100%',
  },
  doubleGap: {
    height: 2,
  },
  asciiContainer: {
    width: '100%',
    alignItems: 'center',
  },
  asciiText: {
    fontFamily: Fonts.mono,
    fontSize: FontSizes.xs,
    color: Colors.faint,
  },
});
