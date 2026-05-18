import AdminInternalMarks from "@/components/internal-marks/AdminInternalMarks";
import FacultyInternalMarks from "@/components/internal-marks/FacultyInternalMarks";
import StudentInternalMarks from "@/components/internal-marks/StudentInternalMarks";
import { useRole } from "@/hooks/use-role";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResultsRoute() {
  const { isFaculty, isStudent, isAdmin } = useRole();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {isFaculty ? (
        <FacultyInternalMarks />
      ) : isStudent ? (
        <StudentInternalMarks />
      ) : isAdmin ? (
        <AdminInternalMarks />
      ) : null}
    </SafeAreaView>
  );
}
