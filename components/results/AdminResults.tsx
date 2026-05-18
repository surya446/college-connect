import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
    adminEditResult,
    deleteResult,
    fetchResultsByClass,
} from "@/services/results";
import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AdminResults() {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch() {
    if (!classId) return;
    const res = await fetchResultsByClass(classId, sectionId || undefined);
    setResults(res);
  }

  async function handleEdit(id: string) {
    // simple prompt-free inline edit could be replaced with modal
    await adminEditResult(id, { grade: "Updated" } as any, "admin-cli");
    // refresh
    await handleSearch();
  }

  async function handleDelete(id: string) {
    await deleteResult(id, "admin-cli");
    await handleSearch();
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Admin — Results</ThemedText>
      <ThemedText type="subtitle">
        Full override and analytics access
      </ThemedText>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="ClassId"
          value={classId}
          onChangeText={setClassId}
          style={styles.input}
        />
        <TextInput
          placeholder="SectionId (optional)"
          value={sectionId}
          onChangeText={setSectionId}
          style={styles.input}
        />
        <TouchableOpacity style={styles.btn} onPress={handleSearch}>
          <ThemedText style={styles.btnText}>Search</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {results.map((r) => (
          <View key={r.id} style={styles.row}>
            <ThemedText>
              {r.studentId} — {r.subjectId} — {r.totalMarks ?? "-"}
            </ThemedText>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => handleEdit(r.id)}>
                <ThemedText>Edit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(r.id)}>
                <ThemedText style={{ color: "red" }}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <ThemedText>
        TODO: add analytics widgets, grade-distribution charts, backlog
        handling, and export CSV/PDF systems.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 6,
    width: 120,
  },
  btn: { backgroundColor: "#0a7ea4", padding: 10, borderRadius: 6 },
  btnText: { color: "#fff" },
  list: { marginTop: 12 },
  row: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f6fbfc",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowActions: { flexDirection: "row", gap: 12 },
});
