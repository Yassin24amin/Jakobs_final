import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Colors } from '@/constants/theme';

export type ZineViewProps = ViewProps;

export function ZineView({ style, children, ...rest }: ZineViewProps) {
  return (
    <View style={[{ backgroundColor: Colors.background }, style]} {...rest}>
      {children}
    </View>
  );
}
