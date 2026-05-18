import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView, ActivityIndicator } from "react-native";
import { Card } from "./card";
import { SectionHeader } from "./section-header";
import { fetchOverviewCounts, subscribeOverviewRealtime, subscribeRecentAudit } from "@/services/admin-dashboard";

export default function AdminDashboard() {
  const [counts, setCounts] = useState<any | null>(null);
  const [audit, setAudit] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const c = await fetchOverviewCounts();
      if (!mounted) return;
      setCounts(c);
    })();

    const unsubOverview = subscribeOverviewRealtime((c) => setCounts(c));
    const unsubAudit = subscribeRecentAudit((items) => setAudit(items));

    return () => {
      mounted = false;
      unsubOverview();
      unsubAudit();
    };
  }, []);

  if (!counts) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Institution Command Center</Text>
      </View>

      {/* TOP OVERVIEW GRID */}
      <SectionHeader title="Overview" />
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <Card style={styles.gridCard}><Text style={styles.kpiValue}>{counts.totalStudents}</Text><Text style={styles.kpiLabel}>Students</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.kpiValue}>{counts.totalFaculty}</Text><Text style={styles.kpiLabel}>Faculty</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.kpiValue}>{counts.departments}</Text><Text style={styles.kpiLabel}>Departments</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.kpiValue}>{counts.activeClasses}</Text><Text style={styles.kpiLabel}>Active Classes</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.kpiValue}>{counts.timetableSlots}</Text><Text style={styles.kpiLabel}>Timetable Slots</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.kpiValue}>{counts.activeComplaints}</Text><Text style={styles.kpiLabel}>Active Complaints</Text></Card>
      </View>

      {/* CRITICAL ALERTS */}
      <SectionHeader title="Critical Alerts" />
      <View style={{ gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Low attendance sections</Text>
          <Text style={{ color: COLORS.textSecondary }}>TODO: implement detector (analytics required)</Text>
        </Card>
        <Card style={{ padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Timetable conflicts</Text>
          <Text style={{ color: COLORS.textSecondary }}>TODO: run conflict detector; see timetable management</Text>
        </Card>
        <Card style={{ padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Pending complaints</Text>
          <Text style={{ color: COLORS.textSecondary }}>{counts.activeComplaints} unresolved complaints</Text>
        </Card>
        <Card style={{ padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Unpublished results</Text>
          <Text style={{ color: COLORS.textSecondary }}>TODO: compute unpublished results via results backlog</Text>
        </Card>
      </View>

      {/* QUICK MANAGEMENT ACTIONS */}
      <SectionHeader title="Quick Actions" />
      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionCard]} onPress={() => router.push('/admin-users')}><Text style={styles.actionTitle}>Manage Users</Text></Pressable>
        <Pressable style={[styles.actionCard]} onPress={() => router.push('/faculty-assignments')}><Text style={styles.actionTitle}>Faculty Assignments</Text></Pressable>
        <Pressable style={[styles.actionCard]} onPress={() => router.push('/timetable')}><Text style={styles.actionTitle}>Timetable Mgmt</Text></Pressable>
        <Pressable style={[styles.actionCard]} onPress={() => router.push('/results')}><Text style={styles.actionTitle}>Publish Results</Text></Pressable>
        <Pressable style={[styles.actionCard]} onPress={() => router.push('/announcements')}><Text style={styles.actionTitle}>Announcements</Text></Pressable>
      </View>

      {/* INSTITUTIONAL ANALYTICS */}
      <SectionHeader title="Institutional Analytics" />
      <View style={{ gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Attendance trends</Text>
          <Text style={{ color: COLORS.textSecondary }}>Mini charts TBD — connect analytics backend</Text>
        </Card>
        <Card style={{ padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>Department performance</Text>
          <Text style={{ color: COLORS.textSecondary }}>TODO: department-level KPIs</Text>
        </Card>
      </View>

      {/* RECENT AUDIT ACTIVITY */}
      <SectionHeader title="Recent Audit Activity" />
      {audit == null ? (
        <ActivityIndicator />
      ) : audit.length === 0 ? (
        <Card style={{ padding: 12 }}><Text>No recent audit activity.</Text></Card>
      ) : (
        audit.map((a) => (
          <Card key={a.id} style={{ padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700' }}>{a.actionType} — {a.actorUid}</Text>
            <Text style={{ color: COLORS.textSecondary }}>{a.timestamp ? String(a.timestamp) : ''}</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>{JSON.stringify(a.metadata ?? {}, null, 0)}</Text>
          </Card>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
    flexWrap: "wrap",
  },
  actionCard: {
    minWidth: 140,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface ?? "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border ?? "#E5E7EB",
    marginBottom: SPACING.sm,
  },
  actionTitle: { color: COLORS.primary, fontWeight: "700" },
  gridCard: { padding: 12, minWidth: 140, flex: 1 },
  kpiValue: { fontSize: 20, fontWeight: "700" },
  kpiLabel: { color: COLORS.textSecondary },
});
