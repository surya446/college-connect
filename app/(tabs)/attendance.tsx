import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AttendanceEmptyState } from "@/components/attendance/attendance-empty-state";
import FacultyAttendanceManager from "@/components/attendance/FacultyAttendanceManager";
import { OverallSummaryCard } from "@/components/attendance/overall-summary-card";
import { SubjectAttendanceCard } from "@/components/attendance/subject-attendance-card";
import {
    DashboardError,
    DashboardLoading,
} from "@/components/dashboard/dashboard-state";
import { DASHBOARD_COLORS } from "@/constants/dashboard";
import { useAttendanceRecords } from "@/hooks/use-attendance-records";
import { useRole } from "@/hooks/use-role";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { records, summary, isLoading, error, retry } = useAttendanceRecords();
  const { isLoading: roleLoading, isFaculty, isAdmin } = useRole();

  const scrollBottomPadding = TAB_BAR_HEIGHT + insets.bottom + 16;

  if (isLoading || roleLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DashboardLoading message="Loading attendance…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DashboardError message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.subtitle}>
            Track your subject-wise class attendance
          </Text>
        </View>

        {/* Faculty/admin see manager UI; students see personal records */}
        {isFaculty || isAdmin ? (
          <FacultyAttendanceManager />
        ) : records.length === 0 ? (
          <AttendanceEmptyState />
        ) : (
          <>
            <OverallSummaryCard summary={summary} />
            <Text style={styles.sectionTitle}>By subject</Text>
            {records.map((record) => (
              <SubjectAttendanceCard key={record.id} record={record} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DASHBOARD_COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: DASHBOARD_COLORS.textSecondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
    marginBottom: 12,
  },
});
