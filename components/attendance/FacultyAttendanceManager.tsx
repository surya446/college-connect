import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AttendanceActions from "./AttendanceActions";
import AttendanceFilters from "./AttendanceFilters";
import AttendanceHeader from "./AttendanceHeader";
import StudentAttendanceList from "./StudentAttendanceList";
import useAttendanceData from "./useAttendanceData";

export default function FacultyAttendanceManager() {
  const data = useAttendanceData();

  const handleSave = async () => {
    try {
      await data.saveSession();
      Alert.alert("Saved", "Attendance saved successfully");
    } catch (err: any) {
      Alert.alert("Save failed", err?.message ?? "Could not save attendance.");
    }
  };

  return (
    <View style={styles.container}>
      <AttendanceHeader />

      <AttendanceFilters
        departments={data.departments}
        subjects={data.subjects}
        years={data.years}
        dept={data.dept}
        setDept={data.setDept}
        year={data.year}
        setYear={data.setYear}
        subject={data.subject}
        setSubject={data.setSubject}
        isFaculty={true}
        assignments={data.assignments}
        selectedAssignmentId={data.selectedAssignmentId}
        setSelectedAssignmentId={data.setSelectedAssignmentId}
      />

      <View style={styles.dateRow}>
        <Text style={{ color: COLORS.textSecondary }}>Date: {data.date}</Text>
      </View>

      <StudentAttendanceList
        students={data.students}
        loading={data.loading}
        onToggle={data.toggleStudent}
      />

      <AttendanceActions onSave={handleSave} saving={data.saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    backgroundColor: COLORS.surface ?? "#fff",
    borderRadius: RADIUS.lg,
  },
  dateRow: { marginBottom: SPACING.md },
});
