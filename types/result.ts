import type { FirestoreTimestamp, SubjectId, UserId } from "@/types/firestore";

/** Detailed Result document shape used by Results service and UI */
export interface ResultDocument {
  id?: string;
  assignmentId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: SubjectId;
  facultyId: UserId;
  studentId: UserId;
  semester: string; // e.g., '2026-S1'
  internalMarks?: number | null;
  externalMarks?: number | null;
  totalMarks?: number | null;
  grade?: string | null;
  sgpaRef?: string | null; // reference id to SGPA doc
  cgpaRef?: string | null; // reference id to CGPA doc
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  metadata?: Record<string, unknown>;
}

// Helper for partial marks entry
export type ResultEntryPayload = Omit<
  Partial<ResultDocument>,
  | "id"
  | "assignmentId"
  | "facultyId"
  | "studentId"
  | "subjectId"
  | "classId"
  | "semester"
>;

// TODO: add strong enums for grade scale, term definitions, and validators
