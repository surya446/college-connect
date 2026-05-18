import { COLORS, TYPOGRAPHY } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AttendanceHeader() {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Take Attendance</Text>
      <Text style={styles.subtitle}>Mark student presence for a class</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: 12 },
  title: { fontSize: TYPOGRAPHY.h3, fontWeight: "700", color: COLORS.text },
  subtitle: { color: COLORS.textSecondary, marginTop: 4 },
});
