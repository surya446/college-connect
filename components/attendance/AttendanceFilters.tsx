import { COLORS, RADIUS, SPACING } from "@/constants/theme";
import type { FacultyAssignment } from "@/types/firestore";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import SelectModal from "./SelectModal";
import type {
    DepartmentOption,
    SubjectOption,
    YearOption,
} from "./useAttendanceData";

export interface AttendanceFiltersProps {
  departments: DepartmentOption[];
  subjects: SubjectOption[];
  years: YearOption[];
  dept: string | null;
  setDept: (id: string | null) => void;
  year: string | null;
  setYear: (id: string | null) => void;
  subject: string | null;
  setSubject: (id: string | null) => void;
  // Assignment-driven (faculty) mode
  isFaculty?: boolean;
  assignments?: FacultyAssignment[];
  selectedAssignmentId?: string | null;
  setSelectedAssignmentId?: (id: string | null) => void;
}

export default function AttendanceFilters({
  departments,
  subjects,
  years,
  dept,
  setDept,
  year,
  setYear,
  subject,
  setSubject,
  isFaculty,
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
}: AttendanceFiltersProps) {
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const deptLabel = useMemo(
    () =>
      departments.find((d) => d.id === dept)?.label ??
      dept ??
      "Select department",
    [departments, dept],
  );
  const yearLabel = useMemo(
    () => (year ? `Year ${year}` : "Select year"),
    [year],
  );
  const subjectLabel = useMemo(
    () => subjects.find((s) => s.id === subject)?.label ?? "Select subject",
    [subjects, subject],
  );

  const assignmentLabel = useMemo(() => {
    if (!assignments || !selectedAssignmentId) return "Select assignment";
    const a = assignments.find((x) => x.id === (selectedAssignmentId as any));
    if (!a) return "Select assignment";
    const subj =
      subjects.find((s) => s.id === a.subjectId)?.label ??
      a.subjectId ??
      "Subject";
    const classPart = a.classId ? `${a.classId}` : "";
    const sectionPart = a.sectionId ? ` · ${a.sectionId}` : "";
    return `${subj} · ${classPart}${sectionPart}`;
  }, [assignments, selectedAssignmentId, subjects]);

  return (
    <View style={styles.controlsColumn}>
      {isFaculty ? (
        <>
          <Pressable
            style={styles.pillFull}
            onPress={() => setShowAssignmentModal(true)}
          >
            <Text>{assignmentLabel}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={styles.pillFull}
            onPress={() => setShowDeptModal(true)}
          >
            <Text>{deptLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.pillFull}
            onPress={() => setShowYearModal(true)}
          >
            <Text>{yearLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.pillFull}
            onPress={() => setShowSubjectModal(true)}
          >
            <Text>{subjectLabel}</Text>
          </Pressable>
        </>
      )}

      <SelectModal
        visible={showDeptModal}
        title="Department"
        options={departments}
        onClose={() => setShowDeptModal(false)}
        onSelect={(o) => {
          setDept(o.id);
          setShowDeptModal(false);
        }}
      />
      <SelectModal
        visible={showYearModal}
        title="Year"
        options={years}
        onClose={() => setShowYearModal(false)}
        onSelect={(o) => {
          setYear(o.id);
          setShowYearModal(false);
        }}
      />
      <SelectModal
        visible={showSubjectModal}
        title="Subject"
        options={subjects}
        onClose={() => setShowSubjectModal(false)}
        onSelect={(o) => {
          setSubject(o.id);
          setShowSubjectModal(false);
        }}
      />
      <SelectModal
        visible={showAssignmentModal}
        title="Assignment"
        options={(assignments || []).map((a) => ({
          id: a.id ?? "",
          label: `${subjects.find((s) => s.id === a.subjectId)?.label ?? a.subjectId} · ${a.classId ?? ""}${a.sectionId ? " · " + a.sectionId : ""}`,
        }))}
        onClose={() => setShowAssignmentModal(false)}
        onSelect={(o) => {
          if (setSelectedAssignmentId) setSelectedAssignmentId(o.id);
          setShowAssignmentModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  controlsColumn: {
    flexDirection: "column",
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  pillFull: {
    width: "100%",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface ?? "#fff",
    borderRadius: RADIUS?.md ?? 10,
    borderWidth: 1,
    borderColor: COLORS.border ?? "#E5E7EB",
    marginBottom: SPACING.sm,
  },
});
