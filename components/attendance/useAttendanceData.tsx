import { useAuth } from "@/context/auth-context";
import { useUserProfile } from "@/hooks/use-user-profile";
import { saveAttendanceSession } from "@/services/attendance-sessions";
import * as deptsService from "@/services/departments";
import * as assignmentsService from "@/services/faculty-assignments";
import * as subjectsService from "@/services/subjects";
import * as usersService from "@/services/users";
import type { AttendanceStudentEntry } from "@/types/attendance";
import type { FacultyAssignment } from "@/types/firestore";
import { useEffect, useState } from "react";

export interface DepartmentOption {
  id: string;
  label: string;
}
export interface SubjectOption {
  id: string;
  label: string;
}
export interface YearOption {
  id: string;
  label: string;
}

export interface UseAttendanceData {
  departments: DepartmentOption[];
  subjects: SubjectOption[];
  years: YearOption[];
  dept: string | null;
  setDept: (id: string | null) => void;
  year: string | null;
  setYear: (id: string | null) => void;
  subject: string | null;
  setSubject: (id: string | null) => void;
  date: string;
  setDate: (d: string) => void;
  students: AttendanceStudentEntry[];
  loading: boolean;
  saving: boolean;
  toggleStudent: (id: string) => void;
  saveSession: () => Promise<void>;
  // assignment-driven (faculty) options
  assignments?: FacultyAssignment[];
  selectedAssignmentId?: string | null;
  setSelectedAssignmentId?: (id: string | null) => void;
}

export default function useAttendanceData(initial?: {
  dept?: string | null;
  year?: string | null;
}): UseAttendanceData {
  const { profile } = useUserProfile();

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const { user } = useAuth();
  const [years] = useState<YearOption[]>(
    ["1", "2", "3", "4", "5", "6"].map((y) => ({ id: y, label: `Year ${y}` })),
  );

  const [dept, setDept] = useState<string | null>(
    initial?.dept ?? profile?.department ?? null,
  );
  const [year, setYear] = useState<string | null>(
    initial?.year ??
      (profile && (profile as any).year ? String((profile as any).year) : null),
  );
  const [subject, setSubject] = useState<string | null>(null);
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const [students, setStudents] = useState<AttendanceStudentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // subscribe to departments list
    const unsubDepts = deptsService.subscribeDepartments((items) => {
      setDepartments(items.map((d) => ({ id: d.id ?? "", label: d.name })));
    });

    // subscribe to subjects list
    const unsubSubjects = subjectsService.subscribeSubjects((items) => {
      setSubjects(items.map((s) => ({ id: s.id ?? "", label: s.name })));
    });

    return () => {
      try {
        unsubDepts();
      } catch {}
      try {
        unsubSubjects();
      } catch {}
    };
  }, []);

  // Subscribe to faculty assignments when profile is a faculty member
  useEffect(() => {
    if (!profile || (profile as any).role !== "faculty" || !user?.uid) {
      setAssignments([]);
      setSelectedAssignmentId(null);
      return;
    }

    const unsub = assignmentsService.subscribeFacultyAssignments(
      user.uid,
      (items) => {
        setAssignments(items);
        if (items.length > 0 && !selectedAssignmentId)
          setSelectedAssignmentId(items[0].id ?? null);
      },
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [profile, user?.uid]);

  useEffect(() => {
    // Faculty path: if faculty and assignment selected, fetch students by class/section
    if (profile && (profile as any).role === "faculty") {
      const assignment = assignments.find((a) => a.id === selectedAssignmentId);
      if (!assignment) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const classId = assignment.classId as string | undefined;
      const sectionId = assignment.sectionId as string | undefined;
      setLoading(true);
      const unsub = usersService.subscribeStudentsByClassSection(
        classId ?? "",
        sectionId ?? null,
        (users) => {
          const list: AttendanceStudentEntry[] = users.map((u) => ({
            studentId: u.id ?? (u as any).uid ?? "",
            status: "absent",
          }));
          setStudents(list);
          setLoading(false);
        },
      );

      return () => unsub();
    }

    // Default path: dept+year
    if (!dept || !year) {
      setStudents([]);
      return;
    }

    setLoading(true);
    const unsub = usersService.subscribeStudentsByDeptYear(
      dept as any,
      year as any,
      (users) => {
        const list: AttendanceStudentEntry[] = users.map((u) => ({
          studentId: u.id ?? (u as any).uid ?? "",
          status: "absent",
        }));
        setStudents(list);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [dept, year, assignments, selectedAssignmentId, profile]);

  const toggleStudent = (id: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === id
          ? { ...s, status: s.status === "present" ? "absent" : "present" }
          : s,
      ),
    );
  };

  const saveSession = async () => {
    if (students.length === 0) throw new Error("no students");

    setSaving(true);
    try {
      // If faculty assignment-driven, include assignment and class/section info
      if (profile && (profile as any).role === "faculty") {
        const assignment = assignments.find(
          (a) => a.id === selectedAssignmentId,
        );
        if (!assignment) throw new Error("assignment required");

        const payload = {
          assignmentId: assignment.id,
          classId: assignment.classId ?? null,
          sectionId: assignment.sectionId ?? null,
          subjectId: assignment.subjectId,
          facultyUid: user?.uid ?? (profile as any).facultyId ?? "unknown",
          date,
          students,
        };

        await saveAttendanceSession(payload as any);
      } else {
        if (!subject) throw new Error("subject required");
        if (!dept) throw new Error("department required");
        if (!year) throw new Error("year required");

        const session = {
          subjectId: subject,
          facultyUid: user?.uid ?? (profile as any)?.facultyId ?? "unknown",
          departmentId: dept,
          year,
          date,
          students,
        };

        await saveAttendanceSession(session as any);
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    departments,
    subjects,
    years,
    dept,
    setDept,
    year,
    setYear,
    subject,
    setSubject,
    date,
    setDate,
    students,
    loading,
    saving,
    toggleStudent,
    saveSession,
    // assignment helpers for faculty
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
  };
}
