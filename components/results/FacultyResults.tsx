import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/auth-context";
import { useUserProfile } from "@/hooks/use-user-profile";
import { fetchAssignmentsForFaculty } from "@/services/faculty-assignments";
import { saveResult } from "@/services/results";
import { subscribeStudentsByClassSection } from "@/services/users";
import type { ResultDocument } from "@/types/result";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function FacultyResults() {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [assignments, setAssignments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [marksMap, setMarksMap] = useState<
    Record<string, { internal?: string; external?: string }>
  >({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) return;
      const assigns = await fetchAssignmentsForFaculty(uid);
      if (!mounted) return;
      setAssignments(assigns);
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!selected) return;
    const unsub = subscribeStudentsByClassSection(
      selected.classId,
      selected.sectionId ?? null,
      (list) => setStudents(list),
    );
    return () => unsub();
  }, [selected]);

  function setMarksForStudent(
    studentId: string,
    field: "internal" | "external",
    value: string,
  ) {
    setMarksMap((s) => ({
      ...s,
      [studentId]: { ...(s[studentId] || {}), [field]: value },
    }));
  }

  async function handleSave() {
    if (!selected) return;
    setLoading(true);
    try {
      // Save results for each student (batching can be added later)
      for (const student of students) {
        const entry: ResultDocument = {
          assignmentId: selected.id,
          classId: selected.classId,
          sectionId: selected.sectionId ?? null,
          subjectId: selected.subjectId,
          facultyId: uid,
          studentId: student.uid || student.id,
          semester: selected.term ?? selected.semester ?? "unknown",
          internalMarks: marksMap[student.uid]?.internal
            ? Number(marksMap[student.uid].internal)
            : null,
          externalMarks: marksMap[student.uid]?.external
            ? Number(marksMap[student.uid].external)
            : null,
        } as ResultDocument;
        await saveResult(entry, uid);
      }
      // lightweight success feedback
    } catch (e) {
      console.error("[FacultyResults.save]", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Manage Results</ThemedText>
      <ThemedText type="subtitle">
        Select an assigned subject/class/section
      </ThemedText>

      <ScrollView style={styles.list}>
        {assignments.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={styles.assignCard}
            onPress={() => setSelected(a)}
          >
            <ThemedText type="defaultSemiBold">
              {a.subjectId} — {a.classId}
              {a.sectionId ? ` / ${a.sectionId}` : ""}
            </ThemedText>
            <ThemedText type="subtitle">Term: {a.term ?? "—"}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selected && (
        <View style={styles.entryArea}>
          <ThemedText type="subtitle">
            Entering marks for {selected.subjectId} — {selected.classId}
            {selected.sectionId ? ` / ${selected.sectionId}` : ""}
          </ThemedText>
          <ScrollView style={styles.studentsList}>
            {students.map((s) => (
              <View key={s.uid ?? s.id} style={styles.studentRow}>
                <ThemedText>
                  {s.displayName ?? s.preferredName ?? s.email}
                </ThemedText>
                <TextInput
                  placeholder="Internal"
                  keyboardType="numeric"
                  style={styles.input}
                  value={marksMap[s.uid]?.internal ?? ""}
                  onChangeText={(t) => setMarksForStudent(s.uid, "internal", t)}
                />
                <TextInput
                  placeholder="External"
                  keyboardType="numeric"
                  style={styles.input}
                  value={marksMap[s.uid]?.external ?? ""}
                  onChangeText={(t) => setMarksForStudent(s.uid, "external", t)}
                />
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.saveText}>Save Results</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { marginTop: 12, maxHeight: 160 },
  assignCard: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f2f7fb",
    marginBottom: 8,
  },
  entryArea: { marginTop: 12, flex: 1 },
  studentsList: { marginTop: 8, maxHeight: 300 },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    width: 80,
    borderRadius: 6,
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#0a7ea4",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "600" },
});
