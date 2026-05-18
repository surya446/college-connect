import { useAuth } from "@/context/auth-context";
import {
    fetchPendingInternalMarksForFaculty,
    subscribeInternalMarksByFaculty,
} from "@/services/internal-marks";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";

export default function FacultyInternalMarks() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [pending, setPending] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchPendingInternalMarksForFaculty(uid);
      if (!mounted) return;
      setPending(list);
    })();

    const unsub = subscribeInternalMarksByFaculty(uid, (items) =>
      setPending(items),
    );
    return () => {
      mounted = false;
      unsub();
    };
  }, [uid]);

  if (pending === null) return <ActivityIndicator />;

  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        Pending Internal Marks
      </Text>
      {pending.length === 0 ? (
        <Text>No pending internal marks.</Text>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View
              style={{ padding: 8, borderBottomWidth: 1, borderColor: "#EEE" }}
            >
              <Text>
                {item.assignmentId} — {item.studentId} — {item.examType}
              </Text>
              <Pressable
                style={{ marginTop: 6 }}
                onPress={() => {
                  /* open marks entry */
                }}
              >
                <Text style={{ color: "blue" }}>Enter marks</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
