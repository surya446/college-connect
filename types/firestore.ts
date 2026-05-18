/**
 * Firestore TypeScript interfaces for CollegeConnect
 * Generated: 2026-05-18
 *
 * Purpose: provide production-ready, scalable, and readable types for
 * Firestore documents and related IDs used across the app.
 */

import type { Timestamp } from "firebase/firestore";

// A permissive timestamp type to keep compatibility with Date, Firestore Timestamp,
// and serialized timestamp shapes used in server payloads.
export type FirestoreTimestamp =
  | Timestamp
  | Date
  | { seconds: number; nanoseconds: number };

// ID aliases for stronger typing and discoverability
export type UserId = string;
export type DepartmentId = string;
export type SubjectId = string;
export type NoteId = string;
export type AttendanceId = string;
export type AnnouncementId = string;
export type TimetableSlotId = string;

// Roles and permissions
export enum UserRole {
  Student = "student",
  Faculty = "faculty",
  Admin = "admin",
  Hod = "hod",
}

// Permissions are extensible strings; list common permissions as union for IDE help
export type Permission =
  | "manage_users"
  | "manage_announcements"
  | "manage_timetable"
  | "manage_attendance"
  | "manage_notes"
  | "view_analytics"
  | "manage_subjects"
  | "manage_departments"
  | string;

// Base document commonalities
export interface BaseDoc {
  readonly id?: string; // Firestore doc id (not always stored in doc)
  readonly createdAt?: FirestoreTimestamp;
  readonly updatedAt?: FirestoreTimestamp;
  readonly createdBy?: UserId;
}

/* ------------------------- Users ------------------------- */

/** Common profile fields for all users */
export interface UserBase extends BaseDoc {
  readonly uid: UserId; // canonical identifier (doc id)
  readonly email: string;
  readonly displayName: string;
  readonly preferredName?: string;
  readonly photoURL?: string;
  readonly role: UserRole;
  readonly departmentId?: DepartmentId;
  readonly isDisabled?: boolean;
  readonly lastActiveAt?: FirestoreTimestamp;
  readonly metadata?: Record<string, unknown>;
}

/** Student-specific profile fields (kept small; heavy lists live in other collections) */
export interface StudentUser extends UserBase {
  readonly role: UserRole.Student;
  readonly studentId?: string; // SIS / roll number
  readonly year?: number; // academic year/cohort
  readonly programme?: string; // e.g., BSc-CS
  readonly classIds?: readonly string[]; // references to cohort/class documents
  readonly section?: string;
  readonly cgpa?: number; // denormalized snapshot for dashboards
  readonly enrolledSubjects?: readonly SubjectId[]; // cached subject ids
  readonly attendanceSummary?: {
    readonly overallPercent?: number;
    readonly lastUpdated?: FirestoreTimestamp;
  };
}

/** Faculty-specific profile fields */
export interface FacultyUser extends UserBase {
  readonly role: UserRole.Faculty;
  readonly facultyId?: string; // employee id
  readonly title?: string; // Dr., Prof., etc.
  readonly assignedDepartments?: readonly DepartmentId[];
  readonly assignedSubjects?: readonly SubjectId[]; // authoritative mapping lives in `subjects` collection
  readonly officeHours?: readonly {
    readonly dayOfWeek: number; // 0 = Sunday, 1 = Monday ...
    readonly start: string; // HH:MM
    readonly end: string; // HH:MM
  }[];
  readonly designation?: string;
  readonly isClassCoordinator?: boolean;
  readonly recentUploads?: readonly NoteId[]; // bounded denormalized list
}

export interface HodUser extends UserBase {
  readonly role: UserRole.Hod;
  readonly departments?: readonly DepartmentId[];
  readonly delegatedTo?: readonly UserId[];
}

/** Admin-specific profile fields */
export interface AdminUser extends UserBase {
  readonly role: UserRole.Admin;
  readonly adminId?: string;
  readonly permissions?: readonly Permission[]; // fine-grained admin capabilities
  readonly rolesHistory?: readonly {
    readonly role: UserRole;
    readonly changedBy?: UserId;
    readonly at: FirestoreTimestamp;
  }[];
  readonly orgScope?: {
    readonly departments?: readonly DepartmentId[];
    readonly campuses?: readonly string[];
  };
}

/** Union of all possible user documents */
export type User = StudentUser | FacultyUser | AdminUser | HodUser;

/* ------------------------- Subjects & Departments ------------------------- */

export interface Subject extends BaseDoc {
  readonly id?: SubjectId;
  readonly code: string; // e.g., CS101
  readonly name: string;
  readonly isActive?: boolean;
  // Subjects are now global reusable entities; department association is optional
  readonly departmentId?: DepartmentId;
  readonly credits?: number;
  readonly category?: string; // optional category like 'core', 'elective'
  readonly electiveType?: string; // optional elective subtype
  readonly facultyUids?: readonly UserId[]; // list of faculty assigned (denormalized)
  readonly semester?: string; // normalized semester field e.g., 'S1' or 'Fall 2026'
  readonly metadata?: Record<string, unknown>;
}

export interface Department extends BaseDoc {
  readonly id?: DepartmentId;
  readonly name: string;
  readonly code: string; // e.g., CSE
  readonly campusId?: string;
  readonly parentDeptId?: DepartmentId | null;
  readonly metadata?: Record<string, unknown>;
}

/* ------------------------- Notes ------------------------- */

export type NoteVisibility = "public" | "department" | "class" | "private";

export interface Note extends BaseDoc {
  readonly id?: NoteId;
  readonly title: string;
  readonly description?: string;
  readonly pdfUrl: string; // CDN or signed URL
  readonly storagePath?: string; // canonical storage path (Supabase)
  readonly uploadedBy: UserId;
  readonly uploadedAt?: FirestoreTimestamp;
  readonly subjectId?: SubjectId;
  readonly departmentId?: DepartmentId;
  readonly visibility?: NoteVisibility;
  readonly tags?: readonly string[];
  readonly size?: number; // bytes
  readonly mimeType?: string;
}

/* ------------------------- Announcements ------------------------- */

export type AnnouncementScope = "global" | "department" | "class" | "subject";

export interface Announcement extends BaseDoc {
  readonly id?: AnnouncementId;
  readonly title: string;
  readonly body: string;
  readonly authorUid: UserId;
  readonly scope: AnnouncementScope;
  readonly targetIds?: readonly string[]; // departmentId / classId / subjectId etc.
  readonly createdAt?: FirestoreTimestamp;
  readonly expiresAt?: FirestoreTimestamp | null;
  readonly pinned?: boolean;
  readonly attachments?: readonly string[]; // file ids/paths
}

/* ------------------------- Timetable ------------------------- */

export interface TimetableSlot extends BaseDoc {
  readonly id?: TimetableSlotId;
  readonly subjectId: SubjectId;
  readonly subjectName?: string; // denormalized for fast reads
  readonly dayOfWeek: number; // 0..6
  readonly startTime: string; // HH:MM
  readonly endTime: string; // HH:MM
  readonly teacherUid?: UserId;
  readonly facultyUid?: UserId; // preferred new field naming
  readonly assignmentId?: string; // normalized link to faculty_assignments
  readonly sectionId?: string | null;
  readonly room?: string;
  readonly departmentId?: DepartmentId;
  readonly classId?: string; // cohort/class id
}

/* ------------------------- Classes & Sections ------------------------- */

export interface ClassDoc extends BaseDoc {
  readonly id?: string;
  readonly code: string; // e.g., CSE-Y3-A
  readonly departmentId: DepartmentId;
  readonly year: number; // academic year/semester indicator
  readonly programme?: string; // e.g., BTech-CS
  readonly sectionIds?: readonly string[]; // sub-sections
  readonly metadata?: Record<string, unknown>;
}

export interface Section extends BaseDoc {
  readonly id?: string;
  readonly classId: string; // parent class/cohort
  readonly name: string; // A, B, 1, 2
  readonly capacity?: number;
  readonly metadata?: Record<string, unknown>;
}

/** Curriculum mapping: maps global subjects into department/year/semester */
export interface CurriculumSubject extends BaseDoc {
  readonly id?: string;
  readonly departmentId: DepartmentId;
  readonly year: number;
  readonly semester: string; // reference to semesters collection
  readonly subjectId: SubjectId;
  readonly isActive?: boolean;
  readonly metadata?: Record<string, unknown>;
}

/* ------------------------- Attendance ------------------------- */

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  readonly uid: UserId;
  readonly status: AttendanceStatus;
  readonly timestamp?: FirestoreTimestamp;
  readonly meta?: Record<string, unknown>;
}

export interface Attendance extends BaseDoc {
  readonly id?: AttendanceId;
  readonly sessionId?: string; // optional human session id
  readonly subjectId?: SubjectId;
  readonly classId?: string;
  readonly date: FirestoreTimestamp;
  readonly records?: readonly AttendanceRecord[]; // prefer paged/segmented writes for large classes
  readonly presentCount?: number;
  readonly absentCount?: number;
  readonly createdBy?: UserId; // faculty who took attendance
}

/** Attendance sessions represent a single class-occurrence where attendance was taken.
 * Use `attendance_sessions` for detailed per-student entries; `attendance` can be used for
 * aggregated snapshots per subject/class/date.
 */
export interface AttendanceSession extends BaseDoc {
  readonly id?: string;
  readonly subjectId: SubjectId;
  readonly subjectName?: string;
  readonly classId?: string;
  readonly sectionId?: string | null;
  readonly departmentId?: DepartmentId;
  readonly date: FirestoreTimestamp;
  readonly facultyUid: UserId; // who took the session
  readonly students: readonly {
    readonly uid: UserId;
    readonly status: AttendanceStatus;
    readonly recordedAt?: FirestoreTimestamp;
    readonly meta?: Record<string, unknown>;
  }[];
  readonly presentCount?: number;
  readonly absentCount?: number;
  readonly notes?: string;
}

/* ------------------------- Extensibility placeholders ------------------------- */

// Analytics documents should be stored in dedicated collections under `analytics/`.
export interface AnalyticsSummary extends BaseDoc {
  readonly metric: string;
  readonly bucket: string; // e.g., '2026-05-18', 'week-2026-W20'
  readonly value: number | Record<string, number>;
}

/* ------------------------- Faculty assignments & results & complaints ------------------------- */

export interface FacultyAssignment extends BaseDoc {
  readonly id?: string;
  readonly facultyUid: UserId;
  readonly facultyId?: UserId; // alias for clarity
  readonly subjectId: SubjectId;
  readonly curriculumSubjectId?: string; // link to curriculum_subjects
  readonly departmentId?: DepartmentId;
  readonly classId?: string; // assigned to a class or multiple classes (normalize via multiple docs)
  readonly sectionId?: string | null;
  readonly academicYear?: string; // e.g., '2026-2027'
  readonly semester?: string; // e.g., 'S1' or 'Fall'
  readonly isActive?: boolean;
  readonly role?: "instructor" | "coordinator" | "assistant" | string;
  readonly permissions?: readonly string[]; // optional overrides for this assignment
  // term is kept for backward compatibility
  readonly term?: string; // e.g., 'Fall 2026'
}

export interface Result extends BaseDoc {
  readonly id?: string;
  readonly studentUid: UserId;
  readonly subjectId: SubjectId;
  readonly classId?: string;
  readonly term?: string; // semester/term
  readonly grade?: string; // e.g., A, B+, raw score etc.
  readonly marks?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface Complaint extends BaseDoc {
  readonly id?: string;
  readonly submittedBy: UserId;
  readonly targetUid?: UserId; // optional (staff/student)
  readonly relatedClassId?: string;
  readonly relatedSubjectId?: SubjectId;
  readonly title: string;
  readonly body: string;
  readonly status: "open" | "in_review" | "resolved" | "rejected";
  readonly assignedTo?: UserId; // staff handling the complaint
}

/* ------------------------- Notes (expanded) ------------------------- */

export interface NoteDoc extends BaseDoc {
  readonly id?: NoteId;
  readonly title: string;
  readonly pdfUrl: string;
  readonly storagePath?: string;
  readonly uploadedBy: UserId;
  readonly uploadedAt?: FirestoreTimestamp;
  readonly subjectId?: SubjectId;
  readonly classId?: string;
  readonly sectionId?: string;
  readonly visibility?: NoteVisibility;
  readonly size?: number;
}

// Notification placeholder; actual implementation may use FCM tokens and a `notifications/` collection
export interface Notification extends BaseDoc {
  readonly id?: string;
  readonly recipientUid: UserId;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown>;
  readonly read?: boolean;
}

/* ------------------------- Exports ------------------------- */
export const __ALL_TYPES = Symbol("firestore-types");

export default {} as unknown as typeof __ALL_TYPES;
