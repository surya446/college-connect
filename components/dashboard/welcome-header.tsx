import { StyleSheet, Text, View } from 'react-native';

import { DASHBOARD_COLORS } from '@/constants/dashboard';

type WelcomeHeaderProps = {
  greeting: string;
  name: string;
  date: string;
  subtitle?: string;
};

export function WelcomeHeader({ greeting, name, date, subtitle }: WelcomeHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting},</Text>
      <Text style={styles.name}>{name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: DASHBOARD_COLORS.textSecondary,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: DASHBOARD_COLORS.text,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DASHBOARD_COLORS.primary,
    marginBottom: 6,
  },
  date: {
    fontSize: 14,
    color: DASHBOARD_COLORS.textMuted,
  },
});
