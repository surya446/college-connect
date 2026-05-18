import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
    addCurriculumSubject,
    deleteCurriculumSubject,
    fetchCurriculumSubjects,
} from "@/services/curriculum-subjects";
import { subscribeDepartments } from "@/services/departments";
import { fetchAllSubjects } from "@/services/subjects";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AdminCurriculum() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<any | null>(null);
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [semester, setSemester] = useState<string>("S1");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dsub = subscribeDepartments((list) => setDepartments(list));
    (async () => {
      const subs = await fetchAllSubjects();
      setSubjects(subs);
    })();
    return () => dsub();
  }, []);

  async function loadCurriculum() {
    if (!selectedDept) return setCurriculum([]);
    setLoading(true);
    try {
      const cur = await fetchCurriculumSubjects(
        selectedDept.id as any,
        parseInt(year, 10),
        semester,
      );
      setCurriculum(cur || []);
    } catch (e) {
      console.error(e);
      setCurriculum([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurriculum();
  }, [selectedDept, year, semester]);

  async function handleAdd(subjectId: string) {
    if (!selectedDept) return Alert.alert("Select department");
    try {
      await addCurriculumSubject(
        selectedDept.id as any,
        parseInt(year, 10),
        semester,
        subjectId,
      );
      loadCurriculum();
      Alert.alert("Added");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <ThemedText type="title">Curriculum Setup</ThemedText>
        <ThemedText type="subtitle">
          Map global subjects into department/year/semester
        </ThemedText>
        <View style={{ marginTop: 12 }}>
          <FlatList
            data={departments}
            horizontal
            keyExtractor={(d, i) => d.id ?? `${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  padding: 8,
                  marginRight: 8,
                  backgroundColor:
                    selectedDept?.id === item.id ? "#e6f4fb" : "#fff",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#eee",
                }}
                onPress={() => setSelectedDept(item)}
              >
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          <TextInput
            placeholder="Year"
            value={year}
            onChangeText={setYear}
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Semester"
            value={semester}
            onChangeText={setSemester}
            style={styles.input}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <ThemedText type="subtitle">Curriculum Subjects</ThemedText>
          {loading ? (
            <ActivityIndicator />
          ) : curriculum.length === 0 ? (
            <Text style={{ color: "#666" }}>
              No curriculum subjects. Add subjects from the global registry.
            </Text>
          ) : (
            <FlatList
              data={curriculum}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text>{item.subjectId}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Remove?",
                        "Remove subject from curriculum?",
                        [
                          { text: "Cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: async () => {
                              await deleteCurriculumSubject(item.id);
                              loadCurriculum();
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Text style={{ color: "red" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>

        <View style={{ marginTop: 12 }}>
          <ThemedText type="subtitle">Global Subjects</ThemedText>
          <FlatList
            data={subjects}
            keyExtractor={(s) => s.id ?? s.code}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 12,
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                <Text style={{ color: "#666" }}>{item.code}</Text>
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={() => handleAdd(item.id)}
                >
                  <Text style={{ color: "#0a7ea4" }}>Add to Curriculum</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
});
