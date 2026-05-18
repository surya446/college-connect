import { useAuth } from "@/context/auth-context";
import { fetchAssignmentsForFaculty } from "@/services/faculty-assignments";
import { fetchPendingInternalMarksForFaculty } from "@/services/internal-marks";
import { fetchNotesCountByUploader } from "@/services/notes-upload";
import { subscribeTimetableForFaculty } from "@/services/timetable";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { Card } from "./card";
import { SectionHeader } from "./section-header";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid ?? "";
  const [assignments, setAssignments] = useState<any[] | null>(null);
  const [todaySlots, setTodaySlots] = useState<any[] | null>(null);
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [pendingMarks, setPendingMarks] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const as = await fetchAssignmentsForFaculty(uid);
      if (!mounted) return;
      setAssignments(as);

      const notes = await fetchNotesCountByUploader(uid);
      if (!mounted) return;
      setNotesCount(notes);

      const pmarks = await fetchPendingInternalMarksForFaculty(uid);
      if (!mounted) return;
      setPendingMarks(pmarks.length);

      setLoading(false);
    })();

    const unsub = subscribeTimetableForFaculty(uid, (slots) => {
      if (!mounted) return;
      const today = new Date().getDay();
      setTodaySlots(slots.filter((s: any) => Number(s.dayOfWeek) === today));
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [uid]);

  const activeAssignmentsCount = useMemo(
    () => (assignments ? assignments.length : 0),
    [assignments],
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <ScrollView style={{ padding: 16 }}>
      {/* TOP HEADER */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          {user?.displayName ?? "Faculty"}
        </Text>
        <Text style={{ color: "#666" }}>
          {(user as any)?.department ?? "Department"} • {activeAssignmentsCount}{" "}
          active assignments
        </Text>
      </View>

      {/* QUICK STATS ROW */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>{todaySlots?.length ?? 0}</Text>
          <Text style={{ color: "#666" }}>Today's classes</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>
            {/* TODO: compute pending attendance submissions */ 0}
          </Text>
          <Text style={{ color: "#666" }}>Pending attendance</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>{notesCount ?? 0}</Text>
          <Text style={{ color: "#666" }}>Notes uploaded</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>{pendingMarks ?? 0}</Text>
          <Text style={{ color: "#666" }}>Pending internal marks</Text>
        </Card>
      </View>

      {/* TODAY'S SCHEDULE */}
      <SectionHeader title="Today's Schedule" />
      {todaySlots && todaySlots.length > 0 ? (
        todaySlots.map((s: any) => (
          <Card key={s.id} style={{ padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: "700" }}>
              {s.subjectName ?? s.subjectId}
            </Text>
            <Text style={{ color: "#666" }}>
              {s.classId} • {s.sectionId ?? "-"} • {s.room ?? "-"}
            </Text>
            <Text style={{ color: "#666" }}>
              {s.startTime} - {s.endTime}
            </Text>
          </Card>
        ))
      ) : (
        <Card style={{ padding: 12 }}>
          <Text>No classes scheduled for today.</Text>
        </Card>
      )}

      {/* ASSIGNED SUBJECTS */}
      <SectionHeader title="Assigned Subjects" />
      {assignments && assignments.length > 0 ? (
        assignments.map((a: any) => (
          <Card key={a.id} style={{ padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: "700" }}>
              {a.subjectName ?? a.subjectId}
            </Text>
            <Text style={{ color: "#666" }}>
              {a.classId} • {a.sectionId ?? "-"} • Students:{" "}
              {a.studentCount ?? "-"}
            </Text>
          </Card>
        ))
      ) : (
        <Card style={{ padding: 12 }}>
          <Text>No assigned subjects.</Text>
        </Card>
      )}

      {/* QUICK ACTIONS */}
      <SectionHeader title="Quick Actions" />
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push("/attendance")}
        >
          <Card style={{ padding: 12 }}>
            <Text style={{ fontWeight: "700" }}>Take Attendance</Text>
          </Card>
        </Pressable>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push("/upload-note")}
        >
          <Card style={{ padding: 12 }}>
            <Text style={{ fontWeight: "700" }}>Upload Notes</Text>
          </Card>
        </Pressable>
      </View>

      {/* RECENT ACTIVITY */}
      <SectionHeader title="Recent Activity" />
      <Card style={{ padding: 12 }}>
        <Text>
          Recent uploads, attendance submissions, timetable changes, and
          internal marks updates will appear here.
        </Text>
        <Text style={{ color: "#666", marginTop: 8 }}>
          TODO: implement recent audit feed and activity grouping.
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
