export type AuditActionType =
  | "attendance_modify"
  | "results_modify"
  | "timetable_change"
  | "faculty_assignment"
  | "user_account"
  | "notes_upload"
  | "notes_delete"
  | "announcement_create"
  | "announcement_delete"
  | "other";

export interface AuditLog {
  id?: string;
  actorUid: string;
  actorRole?: string | null;
  actionType: AuditActionType;
  targetCollection: string;
  targetDocumentId?: string | null;
  timestamp?: any; // serverTimestamp() on write
  metadata?: Record<string, unknown> | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  // Indicates the entry was created by a client as a best-effort fallback.
  clientGenerated?: boolean;
  // Reserved flag for system/server-generated entries. Server SDKs should set this to true.
  systemGenerated?: boolean;
}

// TODO: add helper types for exportable reports, retention policies, and analytics-ready shapes
