import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DASHBOARD_COLORS } from '@/constants/dashboard';

type DashboardLoadingProps = {
  message?: string;
};

export function DashboardLoading({ message = 'Loading your dashboard…' }: DashboardLoadingProps) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={DASHBOARD_COLORS.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

type DashboardErrorProps = {
  message: string;
  onRetry: () => void;
};

export function DashboardError({ message, onRetry }: DashboardErrorProps) {
  return (
    <View style={styles.centered}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle-outline" size={32} color={DASHBOARD_COLORS.danger} />
      </View>
      <Text style={styles.errorTitle}>Unable to load dashboard</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: DASHBOARD_COLORS.background,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    color: DASHBOARD_COLORS.textSecondary,
    textAlign: 'center',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: DASHBOARD_COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: DASHBOARD_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: DASHBOARD_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
