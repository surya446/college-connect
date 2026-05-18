import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
    addClass,
    fetchClassesByDepartmentAndYear,
    subscribeClasses,
} from "@/services/classes";
import { subscribeDepartments } from "@/services/departments";
import type { Department } from "@/types/firestore";
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

export default function AdminClasses() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [programme, setProgramme] = useState<string>("");

  useEffect(() => {
    const dsub = subscribeDepartments((list) => setDepartments(list));
    const csub = subscribeClasses((list) => setClasses(list));
    return () => {
      dsub();
      csub();
    };
  }, []);

  async function handleCreate() {
    if (!selectedDept) return Alert.alert("Select department first");
    setLoading(true);
    try {
      await addClass(
        {
          departmentId: selectedDept.id as any,
          year: parseInt(year, 10),
          programme,
        },
        "admin",
      );
      setProgramme("");
      Alert.alert("Created");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadByDeptYear(deptId: string, yr: number) {
    setLoading(true);
    try {
      const list = await fetchClassesByDepartmentAndYear(deptId, yr);
      setClasses(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Academic Setup — Classes</ThemedText>
        <ThemedText type="subtitle">Create and manage classes/years</ThemedText>
        <View style={{ marginTop: 12 }}>
          <FlatList
            data={departments}
            horizontal
            keyExtractor={(d, i) => d.id ?? `${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chip]}
                onPress={() => {
                  setSelectedDept(item);
                  loadByDeptYear(item.id as any, parseInt(year, 10));
                }}
              >
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        <View style={{ marginTop: 12 }}>
          <TextInput
            placeholder="Year"
            value={year}
            onChangeText={setYear}
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Programme (optional)"
            value={programme}
            onChangeText={setProgramme}
            style={styles.input}
          />
          <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={{ color: "#fff" }}>Add Class / Year</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12 }}>
          <ThemedText type="subtitle">Existing Classes</ThemedText>
          {loading ? (
            <ActivityIndicator />
          ) : classes.length === 0 ? (
            <Text style={{ color: "#666" }}>
              No classes yet. Use the form above to add.
            </Text>
          ) : (
            <FlatList
              data={classes}
              keyExtractor={(c) => c.id as string}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text>
                    {item.code ?? `${item.programme ?? ""} Y${item.year}`}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  createBtn: {
    backgroundColor: "#0a7ea4",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  chip: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 8,
  },
  row: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
});
