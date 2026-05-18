import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/auth-context";
import { db } from "@/firebase/config";
import { useUserProfile } from "@/hooks/use-user-profile";
import { snapshotToList } from "@/services/firestore-helpers";
import { fetchCgpaForStudent, fetchSgpaForStudent } from "@/services/results";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export default function StudentResults() {
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [results, setResults] = useState<any[]>([]);
  const [sgpa, setSgpa] = useState<any[]>([]);
  const [cgpa, setCgpa] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "results"), where("studentId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => setResults(snapshotToList(snap) as any[]),
      (err) => {
        console.error(err);
        setResults([]);
      },
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      setSgpa(await fetchSgpaForStudent(uid));
      setCgpa(await fetchCgpaForStudent(uid));
    })();
  }, [uid]);

  // Group results by semester
  const bySemester = results.reduce<Record<string, any[]>>((acc, r) => {
    const sem = r.semester ?? "Unknown";
    acc[sem] = acc[sem] || [];
    acc[sem].push(r);
    return acc;
  }, {});

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">My Results</ThemedText>
      <ThemedText type="subtitle">Semester-wise and cumulative view</ThemedText>
      <ScrollView style={styles.list}>
        {Object.keys(bySemester).length === 0 && (
          <ThemedText>No results available yet.</ThemedText>
        )}
        {Object.entries(bySemester).map(([sem, items]) => (
          <View key={sem} style={styles.semBlock}>
            <ThemedText type="defaultSemiBold">{sem}</ThemedText>
            {items.map((r) => (
              <View key={r.id} style={styles.row}>
                <ThemedText>{r.subjectId}</ThemedText>
                <ThemedText>
                  {r.totalMarks ?? "-"} ({r.grade ?? "-"})
                </ThemedText>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.sgpaBlock}>
          <ThemedText type="subtitle">SGPA</ThemedText>
          {sgpa.map((s) => (
            <ThemedText key={s.id}>
              {s.semester}: {s.value}
            </ThemedText>
          ))}
        </View>

        <View style={styles.sgpaBlock}>
          <ThemedText type="subtitle">CGPA</ThemedText>
          {cgpa.map((c) => (
            <ThemedText key={c.id}>Cumulative: {c.value}</ThemedText>
          ))}
        </View>
      </ScrollView>
      {/* TODO: add export PDF/transcript generation, and share options */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  list: { marginTop: 12 },
  semBlock: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f7fbfc",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  sgpaBlock: { marginTop: 8 },
});
