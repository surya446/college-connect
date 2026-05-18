import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';

export type Assignment = {
  id: string;
  subject: string;
  title: string;
  due: string;
  urgent: boolean;
};

type AssignmentCardProps = {
  item: Assignment;
};

export function AssignmentCard({ item }: AssignmentCardProps) {
  return (
    <Card style={styles.card} padding="md">
      <View style={styles.content}>
        <Text style={styles.subject}>{item.subject}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.dueRow}>
          <Ionicons name="calendar-outline" size={14} color={DASHBOARD_COLORS.textSecondary} />
          <Text style={styles.due}>Due {item.due}</Text>
        </View>
      </View>
      {item.urgent ? (
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentText}>Soon</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={DASHBOARD_COLORS.border} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  subject: {
    fontSize: 11,
    fontWeight: '700',
    color: DASHBOARD_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: DASHBOARD_COLORS.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  due: {
    fontSize: 13,
    color: DASHBOARD_COLORS.textSecondary,
  },
  urgentBadge: {
    backgroundColor: DASHBOARD_COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '700',
    color: DASHBOARD_COLORS.danger,
  },
});
