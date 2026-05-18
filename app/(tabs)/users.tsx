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

export default function UsersTab() {
  const router = useRouter();

  const items = [
    { label: "Manage Students", route: "/admin-users?type=students" },
    { label: "Manage Faculty", route: "/admin-users?type=faculty" },
    { label: "Manage HODs", route: "/admin-users?type=hod" },
    { label: "Search / Filter", route: "/admin-users" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title">Users</ThemedText>
      <View style={styles.list}>
        {items.map((it) => (
          <TouchableOpacity
            key={it.route}
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
