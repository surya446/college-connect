import { useMemo } from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import AdminDashboard from "@/components/dashboard/admin-dashboard";
import {
    DashboardError,
    DashboardLoading,
} from "@/components/dashboard/dashboard-state";
import FacultyDashboard from "@/components/dashboard/faculty-dashboard";
import StudentDashboard from "@/components/dashboard/student-dashboard";
import { DASHBOARD_COLORS } from "@/constants/dashboard";
import { useRole } from "@/hooks/use-role";
import {
    formatProfileSubtitle,
    useUserProfile,
} from "@/hooks/use-user-profile";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;
const CGPA_SCALE = 10;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profile, isLoading, error, retry } = useUserProfile();
  const isWide = width >= 380;

  const greeting = useMemo(() => getGreeting(), []);
  const scrollBottomPadding = TAB_BAR_HEIGHT + insets.bottom + 16;

  const { isLoading: roleLoading, isStudent, isFaculty, isAdmin } = useRole();

  if (isLoading || roleLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DashboardLoading />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DashboardError
          message={error ?? "Your student profile was not found."}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  // Only compute student-specific UI values when the profile belongs to a student.
  let attendancePercentage: number | null = null;
  let profileSubtitle = "";
  if (isStudent && profile) {
    const attendanceSafe = profile.attendance ?? 0;
    attendancePercentage = Math.min(100, Math.max(0, attendanceSafe));
    profileSubtitle = formatProfileSubtitle(profile.department, profile.year);
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
        {isStudent ? (
          <StudentDashboard />
        ) : isFaculty ? (
          <FacultyDashboard />
        ) : isAdmin ? (
          <AdminDashboard />
        ) : (
          <DashboardError
            message="Unknown role. Please contact admin."
            onRetry={retry}
          />
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
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statsRowStacked: {
    flexDirection: "column",
  },
  list: {
    gap: 12,
    marginBottom: 28,
  },
});
