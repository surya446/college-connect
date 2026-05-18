import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DASHBOARD_COLORS } from '@/constants/dashboard';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'sm' | 'md';
};

export function Card({ children, style, padding = 'md' }: CardProps) {
  return (
    <View style={[styles.card, paddingStyles[padding], style]}>{children}</View>
  );
}

const paddingStyles = StyleSheet.create({
  none: { padding: 0 },
  sm: { padding: 4 },
  md: { padding: 16 },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DASHBOARD_COLORS.border,
    backgroundColor: DASHBOARD_COLORS.background,
    shadowColor: DASHBOARD_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
});
