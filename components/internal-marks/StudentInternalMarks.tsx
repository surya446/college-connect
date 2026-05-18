import { useAuth } from "@/context/auth-context";
import { db } from "@/firebase/config";
import { snapshotToList } from "@/services/firestore-helpers";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function StudentInternalMarks() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [marks, setMarks] = useState<any[] | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "internal_marks"),
      where("studentId", "==", uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => setMarks(snapshotToList(snap) as any[]),
      (err) => {
        console.error(err);
        setMarks([]);
      },
    );
    return () => unsub();
  }, [uid]);

  if (marks === null) return <ActivityIndicator />;

  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        My Internal Marks
      </Text>
      {marks.length === 0 ? (
        <Text>No marks available yet.</Text>
      ) : (
        <FlatList
          data={marks}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View
              style={{ padding: 8, borderBottomWidth: 1, borderColor: "#EEE" }}
            >
              <Text>
                {item.subjectId} — {item.examType} —{" "}
                {item.marks ?? "Not entered"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
