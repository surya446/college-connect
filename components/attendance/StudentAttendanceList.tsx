import { COLORS, SPACING } from "@/constants/theme";
import type { AttendanceStudentEntry } from "@/types/attendance";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import StudentAttendanceCard from "./StudentAttendanceCard";

export interface StudentAttendanceListProps {
  students: AttendanceStudentEntry[];
  loading: boolean;
  onToggle: (id: string) => void;
}

export default function StudentAttendanceList({
  students,
  loading,
  onToggle,
}: StudentAttendanceListProps) {
  return (
    <View style={styles.listWrap}>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : students.length === 0 ? (
        <Text style={{ color: COLORS.textSecondary }}>
          No students found for selected class.
        </Text>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(i) => i.studentId}
          renderItem={({ item }) => (
            <StudentAttendanceCard student={item} onToggle={onToggle} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: { maxHeight: 320, marginBottom: SPACING.md },
});
