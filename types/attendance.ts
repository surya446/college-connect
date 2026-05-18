export type AttendanceRecord = {
  id: string;
  studentId: string;
  subject: string;
  attended: number;
  total: number;
  percentage: number;
};

export type AttendanceFirestore = {
  studentId?: unknown;
  subject?: unknown;
  subjectName?: unknown;
  attended?: unknown;
  attendedClasses?: unknown;
  total?: unknown;
  totalClasses?: unknown;
  percentage?: unknown;
};

export type AttendanceSummary = {
  attended: number;
  total: number;
  percentage: number;
  subjectCount: number;
};

// New: attendance session saved by faculty
export type AttendanceStudentEntry = {
  studentId: string;
  status: "present" | "absent";
};

export type AttendanceSession = {
  id?: string;
  subjectId: string;
  facultyId: string;
  departmentId: string;
  year: string | number;
  date: string; // ISO date string (YYYY-MM-DD)
  students: AttendanceStudentEntry[];
  createdAt?: any; // Firestore timestamp
};
