import { DASHBOARD_COLORS } from "@/constants/dashboard";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type TimetableEntry = {
  id: string;
  subject: string;
  faculty: string;
  startTime: string; // ISO time or HH:mm
  endTime: string;
  classroom?: string;
};

export default function TimetableCard({ entry }: { entry: TimetableEntry }) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.time}>
          {entry.startTime} - {entry.endTime}
        </Text>
        <Text style={styles.room}>{entry.classroom ?? ""}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.subject}>{entry.subject}</Text>
        <Text style={styles.faculty}>{entry.faculty}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2FF",
    shadowColor: DASHBOARD_COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  left: {
    width: 96,
    alignItems: "flex-start",
  },
  time: {
    fontSize: 13,
    fontWeight: "700",
    color: DASHBOARD_COLORS.primary,
  },
  room: {
    fontSize: 12,
    color: DASHBOARD_COLORS.textMuted,
    marginTop: 4,
  },
  right: {
    flex: 1,
    paddingLeft: 12,
  },
  subject: {
    fontSize: 15,
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
    marginBottom: 4,
  },
  faculty: {
    fontSize: 13,
    color: DASHBOARD_COLORS.textSecondary,
  },
});
