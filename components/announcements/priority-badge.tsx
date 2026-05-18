import { StyleSheet, Text, View } from 'react-native';

import type { AnnouncementPriority } from '@/types/announcement';
import { getPriorityBadgeStyle } from '@/utils/announcement-priority';

type PriorityBadgeProps = {
  priority: AnnouncementPriority;
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const badge = getPriorityBadgeStyle(priority);

  return (
    <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
      <Text style={[styles.text, { color: badge.textColor }]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
