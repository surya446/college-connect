import { StyleSheet, Text, View } from 'react-native';

import { AttendanceProgressBar } from '@/components/attendance/attendance-progress-bar';
import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';
import type { AttendanceSummary } from '@/types/attendance';
import { getAttendanceStatusColors } from '@/utils/attendance-status';

type OverallSummaryCardProps = {
  summary: AttendanceSummary;
};

export function OverallSummaryCard({ summary }: OverallSummaryCardProps) {
  const statusColors = getAttendanceStatusColors(summary.percentage);

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Overall attendance</Text>
      <View style={styles.row}>
        <Text style={[styles.percentage, { color: statusColors.main }]}>
          {summary.percentage}%
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColors.light }]}>
          <Text style={[styles.badgeText, { color: statusColors.main }]}>
            {statusColors.label}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {summary.attended} of {summary.total} classes · {summary.subjectCount}{' '}
        {summary.subjectCount === 1 ? 'subject' : 'subjects'}
      </Text>
      <AttendanceProgressBar percentage={summary.percentage} height={10} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DASHBOARD_COLORS.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  percentage: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    color: DASHBOARD_COLORS.textSecondary,
    marginBottom: 14,
  },
});
