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

export default function QuickActionsScreen() {
  const router = useRouter();

  const actions = [
    { label: "Manage Users", route: "/admin-users" },
    { label: "Faculty Assignments", route: "/faculty-assignments" },
    { label: "Publish Results", route: "/admin-setup/results" },
    { label: "Timetable Management", route: "/(tabs)/timetable" },
    { label: "Announcements", route: "/admin-setup/announcements" },
    { label: "Reports", route: "/admin-dashboard" },
    { label: "Add Subject", route: "/admin-setup/curriculum" },
    { label: "Add Class", route: "/admin-setup/classes" },
    { label: "Add Section", route: "/admin-setup/sections" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title">Quick Actions</ThemedText>
      <View style={styles.grid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.route}
            style={styles.card}
            onPress={() => router.push(a.route)}
          >
            <Text style={styles.cardText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  grid: { marginTop: 12, gap: 12 },
  card: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderColor: "#e6eef8",
    borderWidth: 1,
  },
  cardText: { fontSize: 16, fontWeight: "600", color: "#0a7ea4" },
});
