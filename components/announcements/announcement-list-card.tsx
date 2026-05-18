import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PriorityBadge } from '@/components/announcements/priority-badge';
import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';
import { formatAnnouncementDate } from '@/services/announcements';
import type { Announcement } from '@/types/announcement';

type AnnouncementListCardProps = {
  announcement: Announcement;
};

export function AnnouncementListCard({ announcement }: AnnouncementListCardProps) {
  return (
    <Card style={styles.card} padding="md">
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="megaphone" size={18} color={DASHBOARD_COLORS.primary} />
        </View>
        <PriorityBadge priority={announcement.priority} />
      </View>

      <Text style={styles.title}>{announcement.title}</Text>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={DASHBOARD_COLORS.textMuted} />
        <Text style={styles.date}>{formatAnnouncementDate(announcement.createdAt)}</Text>
      </View>

      <Text style={styles.description}>{announcement.description}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DASHBOARD_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  date: {
    fontSize: 13,
    color: DASHBOARD_COLORS.textMuted,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: DASHBOARD_COLORS.textSecondary,
    lineHeight: 22,
  },
});
