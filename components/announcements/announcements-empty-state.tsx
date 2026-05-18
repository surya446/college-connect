import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { DASHBOARD_COLORS } from '@/constants/dashboard';

export function AnnouncementsEmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="notifications-outline" size={32} color={DASHBOARD_COLORS.primary} />
      </View>
      <Text style={styles.title}>No announcements yet</Text>
      <Text style={styles.message}>
        Campus updates and notices will show up here when they are published.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DASHBOARD_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: DASHBOARD_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
