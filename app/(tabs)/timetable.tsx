import {
    DashboardError,
    DashboardLoading,
} from "@/components/dashboard/dashboard-state";
import TimetableCard from "@/components/timetable/timetable-card";
import { DASHBOARD_COLORS } from "@/constants/dashboard";
import { useAuth } from "@/context/auth-context";
import { useRole } from "@/hooks/use-role";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
    fetchTimetableForDepartment,
    subscribeTimetableForClass,
    subscribeTimetableForFaculty,
} from "@/services/timetable";
import { subscribeToUser } from "@/services/users";
import type { User } from "@/types/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

type TimetableDoc = {
  id: string;
  subject: string;
  faculty: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  weekday: string; // Monday..Friday
  department?: string;
  year?: string | number;
};

export default function TimetableScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [fullUser, setFullUser] = useState<User | null>(null);
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
    retry,
  } = useUserProfile();
  const { isStudent, isFaculty, isAdmin } = useRole();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimetableDoc[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setFullUser(null);
      return;
    }
    const unsubUser = subscribeToUser(user.uid, (u) => setFullUser(u));
    return () => {
      try {
        unsubUser();
      } catch (e) {}
    };
  }, [user?.uid]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Role-aware subscription: students see only their class/section, faculty see their assigned slots, admin sees department

    let unsub: (() => void) | null = null;

    if (!profile) {
      setEntries([]);
      setLoading(false);
      return;
    }

    if (isStudent) {
      const classId = (fullUser as any)?.classId ?? "";
      const sectionId = (fullUser as any)?.sectionId ?? null;
      unsub = subscribeTimetableForClass(classId, sectionId, (slots) => {
        const docs = slots.map((s) => ({
          id: s.id ?? "",
          subject: s.subjectName ?? s.subjectId,
          faculty: s.facultyUid ?? s.teacherUid ?? "",
          startTime: s.startTime,
          endTime: s.endTime,
          classroom: s.room,
          weekday: WEEKDAYS[(s.dayOfWeek ?? 1) - 1] ?? WEEKDAYS[0],
          department: s.departmentId,
        }));
        setEntries(docs);
        setLoading(false);
      });
    } else if (isFaculty) {
      const facultyUid = fullUser?.uid ?? fullUser?.id ?? user?.uid ?? "";
      unsub = subscribeTimetableForFaculty(facultyUid, (slots) => {
        const docs = slots.map((s) => ({
          id: s.id ?? "",
          subject: s.subjectName ?? s.subjectId,
          faculty: s.facultyUid ?? s.teacherUid ?? "",
          startTime: s.startTime,
          endTime: s.endTime,
          classroom: s.room,
          weekday: WEEKDAYS[(s.dayOfWeek ?? 1) - 1] ?? WEEKDAYS[0],
          department: s.departmentId,
        }));
        setEntries(docs);
        setLoading(false);
      });
    } else if (isAdmin) {
      // Admin: fetch department-wide timetable (non-realtime for now)
      (async () => {
        try {
          const slots = await fetchTimetableForDepartment(
            profile.department ?? "",
          );
          const docs = slots.map((s) => ({
            id: s.id ?? "",
            subject: s.subjectName ?? s.subjectId,
            faculty: s.facultyUid ?? s.teacherUid ?? "",
            startTime: s.startTime,
            endTime: s.endTime,
            classroom: s.room,
            weekday: WEEKDAYS[s.dayOfWeek - 1] ?? WEEKDAYS[0],
            department: s.departmentId,
          }));
          setEntries(docs);
        } catch (e) {
          console.error("[timetable.adminFetch]", e);
          setError("Failed to load timetable.");
        } finally {
          setLoading(false);
        }
      })();
    }

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [profile, refreshKey]);

  // Refresh handler
  async function onRefresh() {
    setRefreshing(true);
    // Trigger effect to re-run subscriptions
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  }

  // Filter entries for the logged-in user's department and year
  const filtered = useMemo(() => {
    if (!profile) return [] as TimetableDoc[];
    return entries.filter((e) => {
      const deptMatch = !e.department || e.department === profile.department;
      const yearMatch = !e.year || String(e.year) === String(profile.year);
      return deptMatch && yearMatch;
    });
  }, [entries, profile]);

  // Group by weekday for SectionList
  const sections = useMemo(() => {
    return WEEKDAYS.map((day) => ({
      title: day,
      data: filtered.filter((e) => e.weekday === day),
    }));
  }, [filtered]);

  if (profileLoading || loading) {
    return (
      <SafeAreaView style={[styles.safeArea]} edges={["top"]}>
        <DashboardLoading message="Loading timetable…" />
      </SafeAreaView>
    );
  }

  if (profileError || error) {
    return (
      <SafeAreaView style={[styles.safeArea]} edges={["top"]}>
        <DashboardError
          message={profileError ?? error ?? "Could not load timetable."}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  const isEmpty = sections.every((s) => s.data.length === 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.sectionItem}>
            <TimetableCard
              entry={{
                id: item.id,
                subject: item.subject,
                faculty: item.faculty,
                startTime: item.startTime,
                endTime: item.endTime,
                classroom: item.classroom,
              }}
            />
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No timetable available</Text>
            <Text style={styles.emptyMessage}>
              Your timetable hasn't been published yet.
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DASHBOARD_COLORS.primary}
          />
        }
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { paddingHorizontal: 20, paddingTop: 12 },
  sectionHeader: { marginTop: 18, marginBottom: 8 },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: DASHBOARD_COLORS.primary,
  },
  sectionItem: { marginBottom: 10 },
  emptyWrap: { marginTop: 40, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: DASHBOARD_COLORS.text },
  emptyMessage: {
    fontSize: 14,
    color: DASHBOARD_COLORS.textSecondary,
    marginTop: 6,
  },
});
