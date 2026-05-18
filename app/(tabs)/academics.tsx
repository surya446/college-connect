import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AcademicsTab() {
  const router = useRouter();

  const items = [
    { label: "Subjects", route: "/admin-setup/curriculum" },
    { label: "Curriculum", route: "/admin-setup/curriculum" },
    { label: "Classes", route: "/admin-setup/classes" },
    { label: "Sections", route: "/admin-setup/sections" },
    { label: "Timetable", route: "/(tabs)/timetable" },
    { label: "Semester Setup", route: "/admin-setup/semester" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title">Academics</ThemedText>
      <View style={styles.list}>
        {items.map((it) => (
          <TouchableOpacity
            key={`${it.route}-${it.label}`}
            style={styles.row}
            onPress={() => router.push(it.route)}
          >
            <Text style={styles.rowText}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  list: { marginTop: 12, gap: 8 },
  row: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#eef2ff",
  },
  rowText: { fontSize: 16, fontWeight: "600" },
});
