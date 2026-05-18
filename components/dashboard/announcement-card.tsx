import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/dashboard/card';
import { DASHBOARD_COLORS } from '@/constants/dashboard';

export type Announcement = {
  id: string;
  title: string;
  body: string;
  time: string;
};

type AnnouncementCardProps = {
  item: Announcement;
};

export function AnnouncementCard({ item }: AnnouncementCardProps) {
  return (
    <Card style={styles.card} padding="md">
      <View style={styles.iconWrap}>
        <Ionicons name="megaphone" size={18} color={DASHBOARD_COLORS.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.text}>{item.body}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: DASHBOARD_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: DASHBOARD_COLORS.text,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: DASHBOARD_COLORS.textMuted,
  },
  text: {
    fontSize: 14,
    color: DASHBOARD_COLORS.textSecondary,
    lineHeight: 20,
  },
});
