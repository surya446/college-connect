import { ANNOUNCEMENTS_MOCK, TIMETABLE_MOCK } from "@/constants/dashboard";
import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import {
    formatProfileSubtitle,
    formatYearLabel,
    useUserProfile,
} from "@/hooks/use-user-profile";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AnnouncementCard } from "./announcement-card";
import { SectionHeader } from "./section-header";
import { ProgressBar, StatCard } from "./stat-card";
import { TimetableCard } from "./timetable-card";
import { WelcomeHeader } from "./welcome-header";

export default function StudentDashboard() {
  const { profile } = useUserProfile();
  if (!profile) return null;

  const attendancePercentage = Math.min(
    100,
    Math.max(0, profile.attendance ?? 0),
  );
  const profileSubtitle = formatProfileSubtitle(
    profile.department,
    profile.year,
  );

  return (
    <>
      <WelcomeHeader
        greeting={`Welcome`}
        name={profile.name}
        subtitle={profileSubtitle}
        date={new Date().toLocaleDateString()}
      />

      <View style={styles.row}>
        <StatCard
          label="Attendance"
          value={`${attendancePercentage}%`}
          meta={`${profile.department} · ${formatYearLabel(profile.year)}`}
          icon="checkmark-circle"
          iconColor={COLORS.primary}
          iconBackground={COLORS.primaryLight}
          footer={<ProgressBar percentage={attendancePercentage} />}
        />
        <StatCard
          label="CGPA"
          value={(profile.cgpa ?? 0).toFixed(1)}
          meta={`Out of 10.0 · ${profile.role}`}
          icon="school"
          iconColor={COLORS.violet}
          iconBackground={COLORS.violetLight}
        />
      </View>

      <SectionHeader title="Today's timetable" />
      <TimetableCard slots={TIMETABLE_MOCK} />

      <SectionHeader
        title="Announcements"
        actionLabel="See all"
        onActionPress={() => router.push("/announcements")}
      />
      <View style={styles.list}>
        {ANNOUNCEMENTS_MOCK.map((item) => (
          <AnnouncementCard key={item.id} item={item} />
        ))}
      </View>

      <SectionHeader
        title="Notes"
        actionLabel="See all"
        onActionPress={() => router.push("/notes")}
      />
      <View style={styles.list}>
        {/* Reuse existing notes UI elsewhere; link to notes tab */}
        <Pressable
          onPress={() => router.push("/notes")}
          style={styles.linkCard}
        >
          <Text style={styles.linkText}>Open Notes</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.md },
  list: { gap: SPACING.md, marginBottom: SPACING.xl },
  linkCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface ?? "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border ?? "#E5E7EB",
  },
  linkText: { color: COLORS.primary, fontWeight: "700" },
});
