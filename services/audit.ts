import { db, functions } from "@/firebase/config";
import type { AuditActionType, AuditLog } from "@/types/audit";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
console.debug("[import] services/audit.ts");

const AUDIT_COLLECTION = "audit_logs";

export type AuditInput = Omit<Partial<AuditLog>, "timestamp"> & {
  actorUid: string;
  actionType: AuditActionType;
  targetCollection: string;
  targetDocumentId?: string | null;
  metadata?: Record<string, unknown> | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  clientGenerated?: boolean;
};

/**
 * Log an audit event. Preferred path: callable Cloud Function `logAuditEvent`
 * which runs with Admin privileges and writes immutable logs. Fallback: write
 * directly to Firestore with `clientGenerated=true` so the client can still
 * surface realtime audit-like feeds (not recommended for compliance).
 */
export async function logAudit(event: AuditInput) {
  // Preferred: attempt callable Cloud Function to write system-generated audit
  // entries. If callable is missing or fails, fallback to direct Firestore
  // write that marks the entry as `clientGenerated` so it can be filtered.
  try {
    const fn = httpsCallable(functions, "logAuditEvent");
    const payload = { ...event } as any;
    const res = await fn(payload);
    return res?.data;
  } catch (callableErr) {
    // Do not throw — auditing must be best-effort and non-blocking for UX.
    if ((callableErr as any)?.message?.toLowerCase?.()?.includes("not-found")) {
      console.warn(
        "[audit] callable unavailable, using Firestore fallback",
        (callableErr as any)?.message,
      );
    } else {
      console.warn(
        "[audit] callable logAuditEvent failed, falling back",
        callableErr,
      );
    }

    // Fallback: write to Firestore with `clientGenerated: true` so it's
    // distinguishable from server-generated (system) logs. This write must
    // never throw to callers — swallow errors after logging.
    try {
      await addDoc(collection(db, AUDIT_COLLECTION), {
        ...event,
        timestamp: serverTimestamp(),
        clientGenerated: true,
      } as any);
      return { fallback: true } as any;
    } catch (e) {
      console.warn("[audit] fallback write failed (non-blocking)", e);
      // swallow
      return { fallback: false } as any;
    }
  }
}

// TODOs:
// - Add batching helper for high-volume events and export utilities
// - Implement a centralized immutable audit pipeline (backend-only enforcement)
// - Add retention/TTL management and scheduled exports to analytics
// - Provide a dedicated backend callable `logAuditEvent` that enforces schema
//   and immutability (future work; current client fallback is best-effort)
