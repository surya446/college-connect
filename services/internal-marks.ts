import { db } from "@/firebase/config";
import type { UserId } from "@/types/firestore";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";
import { logAudit } from "./audit";
import { snapshotToList } from "./firestore-helpers";

const INTERNAL = "internal_marks";

export type InternalMark = {
  id?: string;
  assignmentId: string;
  studentId: string;
  facultyId: string;
  classId?: string;
  sectionId?: string | null;
  marks?: number | null;
  examType?: "internal" | "mid" | string;
  createdAt?: any;
  updatedAt?: any;
};

export async function fetchPendingInternalMarksForFaculty(facultyUid: UserId) {
  const q = query(
    collection(db, INTERNAL),
    where("facultyId", "==", facultyUid),
    where("marks", "==", null),
  );
  const snap = await getDocs(q);
  return snapshotToList<InternalMark>(snap) as InternalMark[];
}

export function subscribeInternalMarksByFaculty(
  facultyUid: UserId,
  cb: (items: InternalMark[]) => void,
) {
  const q = query(
    collection(db, INTERNAL),
    where("facultyId", "==", facultyUid),
  );
  const unsub = onSnapshot(
    q,
    (snap) => cb(snapshotToList<InternalMark>(snap) as InternalMark[]),
    (err) => {
      console.error("[internal-marks.subscribe]", err);
      cb([]);
    },
  );
  return unsub;
}

export async function saveInternalMark(
  payload: InternalMark,
  actorUid: UserId,
) {
  const data: any = { ...payload, updatedAt: serverTimestamp() };
  if (!payload.id) {
    data.createdAt = serverTimestamp();
    const ref = await addDoc(collection(db, INTERNAL), data);
    try {
      await logAudit({
        actorUid,
        actionType: "results_modify",
        targetCollection: INTERNAL,
        targetDocumentId: ref.id,
        newState: data,
        clientGenerated: true,
      });
    } catch (_) {}
    return ref.id;
  }
  const d = doc(db, INTERNAL, payload.id);
  await setDoc(d, data, { merge: true });
  try {
    await logAudit({
      actorUid,
      actionType: "results_modify",
      targetCollection: INTERNAL,
      targetDocumentId: payload.id,
      newState: data,
      clientGenerated: true,
    });
  } catch (_) {}
  return payload.id;
}

// TODO: support batching marks entry, mid-exam workflows, grade validation, and exportable mark sheets
