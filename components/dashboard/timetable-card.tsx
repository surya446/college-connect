import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';

export type TimetableSlot = {
  id: string;
  time: string;
  end: string;
  subject: string;
  room: string;
};

type TimetableCardProps = {
  slots: readonly TimetableSlot[];
};

export function TimetableCard({ slots }: TimetableCardProps) {
  return (
    <Card padding="sm" style={styles.container}>
      {slots.map((slot, index) => (
        <View
          key={slot.id}
          style={[styles.row, index < slots.length - 1 && styles.rowDivider]}>
          <View style={styles.timeColumn}>
            <Text style={styles.time}>{slot.time}</Text>
            <Text style={styles.timeEnd}>{slot.end}</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.details}>
            <Text style={styles.subject} numberOfLines={1}>
              {slot.subject}
            </Text>
            <View style={styles.roomRow}>
              <Ionicons name="location-outline" size={14} color={DASHBOARD_COLORS.textSecondary} />
              <Text style={styles.room} numberOfLines={1}>
                {slot.room}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: DASHBOARD_COLORS.borderLight,
  },
  timeColumn: {
    width: 52,
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    color: DASHBOARD_COLORS.primary,
  },
  timeEnd: {
    fontSize: 11,
    color: DASHBOARD_COLORS.textMuted,
    marginTop: 2,
  },
  line: {
    width: 2,
    height: 38,
    backgroundColor: DASHBOARD_COLORS.primaryLight,
    borderRadius: 1,
    marginHorizontal: 12,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  subject: {
    fontSize: 15,
    fontWeight: '600',
    color: DASHBOARD_COLORS.text,
    marginBottom: 4,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  room: {
    flex: 1,
    fontSize: 13,
    color: DASHBOARD_COLORS.textSecondary,
  },
});
