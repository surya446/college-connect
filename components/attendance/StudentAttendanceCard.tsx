import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import type { AttendanceStudentEntry } from "@/types/attendance";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface StudentAttendanceCardProps {
  student: AttendanceStudentEntry;
  onToggle: (id: string) => void;
}

export default function StudentAttendanceCard({
  student,
  onToggle,
}: StudentAttendanceCardProps) {
  return (
    <Pressable
      style={styles.studentRow}
      onPress={() => onToggle(student.studentId)}
    >
      <Text style={styles.studentText}>{student.studentId}</Text>
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor:
              student.status === "present"
                ? COLORS.successLight
                : COLORS.borderLight,
          },
        ]}
      >
        <Text
          style={{
            color: student.status === "present" ? COLORS.success : COLORS.text,
          }}
        >
          {student.status}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  studentText: { color: COLORS.text },
  statusPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
});
