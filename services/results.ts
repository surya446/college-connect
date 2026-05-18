import { db } from "@/firebase/config";
import type { UserId } from "@/types/firestore";
import type { ResultDocument } from "@/types/result";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where
} from "firebase/firestore";
import { logAudit } from "./audit";
import { fetchAssignmentsForFaculty } from "./faculty-assignments";
import { snapshotToList } from "./firestore-helpers";
import { safeGetDocs, safeOnSnapshot } from "./firestore-safe";

const RESULTS = "results";
const RESULTS_HISTORY = "results_history";
const BACKLOGS = "result_backlogs";
const SGPA = "sgpa";
const CGPA = "cgpa";
const ANALYTICS = "analytics";

/** Verify that a faculty UID has an assignment matching the provided ids */
async function verifyFacultyAssignment(
  facultyUid: string,
  subjectId: string,
  classId?: string,
  sectionId?: string | null,
): Promise<boolean> {
  const assigns = await fetchAssignmentsForFaculty(facultyUid);
  return assigns.some(
    (a) =>
      a.subjectId === subjectId &&
      (a.classId == null || !classId || a.classId === classId) &&
      (a.sectionId == null || a.sectionId === sectionId),
  );
}

export async function fetchResultsByAssignment(assignmentId: string) {
  const q = query(
    collection(db, RESULTS),
    where("assignmentId", "==", assignmentId),
  );
  const snap = await safeGetDocs(q as any);
  return snapshotToList<ResultDocument>(snap) as ResultDocument[];
}

export async function fetchResultsByClass(
  classId: string,
  sectionId?: string | null,
) {
  const q = sectionId
    ? query(
        collection(db, RESULTS),
        where("classId", "==", classId),
        where("sectionId", "==", sectionId),
      )
    : query(collection(db, RESULTS), where("classId", "==", classId));
  const snap = await getDocs(q);
  return snapshotToList<ResultDocument>(snap) as ResultDocument[];
}

export function subscribeResultsByAssignment(
  assignmentId: string,
  cb: (items: ResultDocument[]) => void,
) {
  const q = query(
    collection(db, RESULTS),
    where("assignmentId", "==", assignmentId),
  );
  const unsub = safeOnSnapshot(
    q as any,
    (snap) => cb(snapshotToList<ResultDocument>(snap) as ResultDocument[]),
    (err) => {
      console.error("[results.subscribeByAssignment]", err);
      cb([]);
    },
  );
  return unsub;
}

/** Save a result document. Faculty may only save for their assignment. Admin can override. */
export async function saveResult(
  payload: ResultDocument,
  actorUid: UserId,
  options: { adminOverride?: boolean } = {},
): Promise<string> {
  if (!options.adminOverride) {
    const ok = await verifyFacultyAssignment(
      actorUid,
      payload.subjectId,
      payload.classId,
      payload.sectionId,
    );
    if (!ok)
      throw new Error(
        "unauthorized: faculty is not assigned to this subject/class/section",
      );
    if (actorUid !== payload.facultyId)
      throw new Error("unauthorized: faculty id mismatch");
  }

  const data = {
    ...payload,
    totalMarks:
      payload.totalMarks ??
      (payload.internalMarks ?? 0) + (payload.externalMarks ?? 0),
    updatedAt: serverTimestamp(),
  } as any;

  // If document id present, upsert via setDoc
  if (payload.id) {
    const d = doc(db, RESULTS, payload.id);
    await setDoc(d, data, { merge: true });
    // Audit: update result
    try {
      await logAudit({
        actorUid: actorUid,
        actionType: "results_modify",
        targetCollection: RESULTS,
        targetDocumentId: payload.id,
        metadata: { adminOverride: !!options.adminOverride },
        newState: data,
        clientGenerated: true,
      });
    } catch (e) {
      console.warn("[results.save] audit log failed", e);
    }
    return payload.id;
  }

  // create new
  const ref = await addDoc(collection(db, RESULTS), {
    ...data,
    createdAt: serverTimestamp(),
  });

  // also write a history entry for auditing
  try {
    await addDoc(collection(db, RESULTS_HISTORY), {
      resultId: ref.id,
      snapshot: data,
      createdAt: serverTimestamp(),
      createdBy: actorUid,
    });
  } catch (e) {
    console.warn("[results.save] failed to write history", e);
  }

  // Audit: result created
  try {
    await logAudit({
      actorUid: actorUid,
      actionType: "results_modify",
      targetCollection: RESULTS,
      targetDocumentId: ref.id,
      newState: data,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[results.save] audit log failed", e);
  }

  return ref.id;
}

export async function adminEditResult(
  resultId: string,
  updates: Partial<ResultDocument>,
  adminUid: UserId,
) {
  const d = doc(db, RESULTS, resultId);
  await setDoc(
    d,
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await addDoc(collection(db, RESULTS_HISTORY), {
    resultId,
    snapshot: updates,
    action: "admin_edit",
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  });
  // Audit: admin edited a result
  try {
    await logAudit({
      actorUid: adminUid,
      actionType: "results_modify",
      targetCollection: RESULTS,
      targetDocumentId: resultId,
      metadata: { action: "admin_edit" },
      newState: updates as any,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[results.adminEditResult] audit log failed", e);
  }
}

export async function deleteResult(resultId: string, adminUid?: UserId) {
  await deleteDoc(doc(db, RESULTS, resultId));
  try {
    await addDoc(collection(db, RESULTS_HISTORY), {
      resultId,
      action: "delete",
      createdAt: serverTimestamp(),
      createdBy: adminUid ?? null,
    });
  } catch (_) {
    // non-blocking
  }
  try {
    await logAudit({
      actorUid: adminUid ?? "system",
      actionType: "results_modify",
      targetCollection: RESULTS,
      targetDocumentId: resultId,
      metadata: { action: "delete" },
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[results.deleteResult] audit log failed", e);
  }
}

// Lightweight placeholders for SGPA/CGPA bookkeeping; can be expanded into server-side computation
export async function fetchSgpaForStudent(studentUid: string) {
  const q = query(collection(db, SGPA), where("studentUid", "==", studentUid));
  const snap = await safeGetDocs(q as any);
  return snapshotToList(snap) as any[];
}

export async function fetchCgpaForStudent(studentUid: string) {
  const q = query(collection(db, CGPA), where("studentUid", "==", studentUid));
  const snap = await safeGetDocs(q as any);
  return snapshotToList(snap) as any[];
}

// TODO: implement result locking/freeze, transcript PDF generation, moderation workflows, and grade analytics exports
