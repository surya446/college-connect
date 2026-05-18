import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';

type StatCardProps = {
  label: string;
  value: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function StatCard({
  label,
  value,
  meta,
  icon,
  iconColor,
  iconBackground,
  footer,
  style,
}: StatCardProps) {
  return (
    <Card style={[styles.statCard, style]} padding="md">
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.meta}>{meta}</Text>
      {footer}
    </Card>
  );
}

export function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, percentage)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: DASHBOARD_COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 30,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    letterSpacing: -0.8,
  },
  meta: {
    fontSize: 12,
    color: DASHBOARD_COLORS.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: DASHBOARD_COLORS.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: DASHBOARD_COLORS.primary,
  },
});
