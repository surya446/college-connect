import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnnouncementListCard } from '@/components/announcements/announcement-list-card';
import { AnnouncementsEmptyState } from '@/components/announcements/announcements-empty-state';
import { DashboardError, DashboardLoading } from '@/components/dashboard/dashboard-state';
import { DASHBOARD_COLORS } from '@/constants/dashboard';
import { useAnnouncements } from '@/hooks/use-announcements';

export default function AnnouncementsScreen() {
  const { announcements, isLoading, isRefreshing, error, refresh, retry } = useAnnouncements();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader onBack={() => router.back()} />
        <DashboardLoading message="Loading announcements…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader onBack={() => router.back()} />
        <DashboardError message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={DASHBOARD_COLORS.primary}
            colors={[DASHBOARD_COLORS.primary]}
          />
        }>
        <View style={styles.intro}>
          <Text style={styles.title}>Announcements</Text>
          <Text style={styles.subtitle}>Latest campus updates and notices</Text>
        </View>

        {announcements.length === 0 ? (
          <AnnouncementsEmptyState />
        ) : (
          announcements.map((announcement) => (
            <AnnouncementListCard key={announcement.id} announcement={announcement} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ScreenHeaderProps = {
  onBack: () => void;
};

function ScreenHeader({ onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={DASHBOARD_COLORS.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DASHBOARD_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DASHBOARD_COLORS.primaryLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  intro: {
    marginBottom: 20,
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: DASHBOARD_COLORS.textSecondary,
    lineHeight: 22,
  },
});
