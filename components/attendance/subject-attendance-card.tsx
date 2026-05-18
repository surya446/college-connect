import { StyleSheet, Text, View } from 'react-native';

import { AttendanceProgressBar } from '@/components/attendance/attendance-progress-bar';
import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';
import type { AttendanceRecord } from '@/types/attendance';
import { getAttendanceStatusColors } from '@/utils/attendance-status';

type SubjectAttendanceCardProps = {
  record: AttendanceRecord;
};

export function SubjectAttendanceCard({ record }: SubjectAttendanceCardProps) {
  const statusColors = getAttendanceStatusColors(record.percentage);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.subject} numberOfLines={2}>
          {record.subject}
        </Text>
        <Text style={[styles.percentage, { color: statusColors.main }]}>
          {record.percentage}%
        </Text>
      </View>
      <Text style={styles.classes}>
        {record.attended} of {record.total} classes attended
      </Text>
      <AttendanceProgressBar percentage={record.percentage} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  subject: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    lineHeight: 22,
  },
  percentage: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  classes: {
    fontSize: 14,
    color: DASHBOARD_COLORS.textSecondary,
    marginBottom: 12,
  },
});
