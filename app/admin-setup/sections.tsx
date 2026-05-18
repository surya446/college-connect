import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { subscribeClasses } from "@/services/classes";
import { addSection, fetchSectionsByClass } from "@/services/sections";
import type { ClassDoc } from "@/types/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AdminSections() {
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassDoc | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeClasses((list) => setClasses(list));
    return () => unsub();
  }, []);

  async function loadSectionsForClass(cid?: string) {
    if (!cid) return setSections([]);
    setLoading(true);
    try {
      const list = await fetchSectionsByClass(cid);
      setSections(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createSection() {
    if (!selectedClass) return Alert.alert("Select class first");
    setLoading(true);
    try {
      await addSection(
        {
          classId: selectedClass.id as any,
          name,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
        },
        "admin",
      );
      setName("");
      setCapacity("");
      loadSectionsForClass(selectedClass.id as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <ThemedText type="title">Academic Setup — Sections</ThemedText>
        <ThemedText type="subtitle">Manage sections for classes</ThemedText>
        <FlatList
          data={classes}
          horizontal
          keyExtractor={(c, i) => c.id ?? `${i}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                padding: 8,
                marginRight: 8,
                backgroundColor:
                  selectedClass?.id === item.id ? "#e6f4fb" : "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#eee",
              }}
              onPress={() => {
                setSelectedClass(item);
                loadSectionsForClass(item.id as any);
              }}
            >
              <Text>
                {item.code ?? `${item.programme ?? ""} Y${item.year}`}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={{ marginTop: 12 }}>
          <TextInput
            placeholder="Section name (A,B)"
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: "#eee",
              padding: 8,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <TextInput
            placeholder="Capacity"
            value={capacity}
            onChangeText={setCapacity}
            style={{
              borderWidth: 1,
              borderColor: "#eee",
              padding: 8,
              borderRadius: 8,
              marginBottom: 8,
            }}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={{
              backgroundColor: "#0a7ea4",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={createSection}
          >
            <Text style={{ color: "#fff" }}>Add Section</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <ThemedText type="subtitle">Sections</ThemedText>
          {loading ? (
            <ActivityIndicator />
          ) : sections.length === 0 ? (
            <Text style={{ color: "#666" }}>
              No sections yet. Add to begin.
            </Text>
          ) : (
            <FlatList
              data={sections}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "#fff",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text>
                    {item.name} • cap {item.capacity ?? "—"}
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
