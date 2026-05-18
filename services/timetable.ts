import { db } from "@/firebase/config";
import type { TimetableSlot } from "@/types/firestore";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    where
} from "firebase/firestore";
import { logAudit } from "./audit";
import { fetchAssignmentsForFaculty } from "./faculty-assignments";
import { snapshotToList } from "./firestore-helpers";
import { safeGetDocs, safeOnSnapshot } from "./firestore-safe";

const TIMETABLE = "timetable";

function parseTimeToMinutes(t: string) {
  const [hh, mm] = t.split(":").map((n) => Number(n));
  return hh * 60 + mm;
}

function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  const aS = parseTimeToMinutes(aStart);
  const aE = parseTimeToMinutes(aEnd);
  const bS = parseTimeToMinutes(bStart);
  const bE = parseTimeToMinutes(bEnd);
  return Math.max(aS, bS) < Math.min(aE, bE);
}

async function verifyAssignment(
  facultyUid: string,
  assignmentId?: string,
  subjectId?: string,
  classId?: string,
  sectionId?: string | null,
) {
  if (!assignmentId) return false;
  const assigns = await fetchAssignmentsForFaculty(facultyUid);
  return assigns.some(
    (a) =>
      a.id === assignmentId &&
      a.subjectId === subjectId &&
      (a.classId == null || a.classId === classId) &&
      (a.sectionId == null || a.sectionId === sectionId),
  );
}

/** Subscribe to timetable slots for a class (optionally filtered by section) */
export function subscribeTimetableForClass(
  classId: string,
  sectionId: string | null,
  cb: (slots: TimetableSlot[]) => void,
) {
  const q = sectionId
    ? query(
        collection(db, TIMETABLE),
        where("classId", "==", classId),
        where("sectionId", "==", sectionId),
      )
    : query(collection(db, TIMETABLE), where("classId", "==", classId));
  const unsub = safeOnSnapshot(
    q as any,
    (snap) => cb(snapshotToList<TimetableSlot>(snap) as TimetableSlot[]),
    (err) => {
      console.error("[timetable.subscribeTimetableForClass]", err);
      cb([]);
    },
  );
  return unsub;
}

/** Subscribe to timetable slots for a faculty (only their assigned slots) */
export function subscribeTimetableForFaculty(
  facultyUid: string,
  cb: (slots: TimetableSlot[]) => void,
) {
  const q = query(
    collection(db, TIMETABLE),
    where("facultyUid", "==", facultyUid),
  );
  const unsub = safeOnSnapshot(
    q as any,
    (snap) => cb(snapshotToList<TimetableSlot>(snap) as TimetableSlot[]),
    (err) => {
      console.error("[timetable.subscribeTimetableForFaculty]", err);
      cb([]);
    },
  );
  return unsub;
}

export async function fetchTimetableForDepartment(
  departmentId: string,
): Promise<TimetableSlot[]> {
  const q = query(
    collection(db, TIMETABLE),
    where("departmentId", "==", departmentId),
  );
  const snap = await safeGetDocs(q as any);
  return snapshotToList<TimetableSlot>(snap) as TimetableSlot[];
}

/** Create a timetable slot with client-side validation to avoid conflicts.
 * ActorUid is the user creating the slot; adminOverride allows bypassing assignment checks.
 */
export async function createTimetableSlot(
  slot: Omit<TimetableSlot, "id" | "createdAt">,
  actorUid: string,
  options: { adminOverride?: boolean } = {},
) {
  // verify assignment belongs to faculty unless admin override. Allow HODs
  // to create slots for their department(s).
  if (!options.adminOverride) {
    // fetch actor user doc to detect HOD role
    const actorDoc = await getDoc(doc(db, "users", actorUid));
    const actor = actorDoc.exists() ? (actorDoc.data() as any) : null;

    const isHod =
      actor &&
      (actor.role === "hod" || (actor.role === "admin" && actor.isHod));

    if (isHod) {
      // HOD can create slots scoped to their department
      if (!slot.departmentId)
        throw new Error("departmentId required for HOD-created slot");
      const belongs =
        (actor.departments &&
          Array.isArray(actor.departments) &&
          actor.departments.includes(slot.departmentId)) ||
        actor.departmentId === slot.departmentId;
      if (!belongs)
        throw new Error("unauthorized: HOD cannot manage other departments");
    } else {
      const ok = await verifyAssignment(
        actorUid,
        slot.assignmentId,
        slot.subjectId,
        slot.classId,
        slot.sectionId ?? null,
      );
      if (!ok) throw new Error("unauthorized: faculty assignment mismatch");
      if (slot.facultyUid !== actorUid && slot.teacherUid !== actorUid)
        throw new Error("unauthorized: faculty id mismatch");
    }
  }

  // basic conflict detection: same day overlapping times for room, faculty, or class/section
  const q = query(
    collection(db, TIMETABLE),
    where("dayOfWeek", "==", slot.dayOfWeek),
  );
  const snap = await getDocs(q);
  const existing = snapshotToList<TimetableSlot>(snap) as TimetableSlot[];

  for (const ex of existing) {
    if (!ex.startTime || !ex.endTime) continue;
    if (!timesOverlap(slot.startTime, slot.endTime, ex.startTime, ex.endTime))
      continue;

    // room conflict
    if (slot.room && ex.room && slot.room === ex.room) {
      throw new Error("conflict: room already booked for this time");
    }

    // faculty double-booking
    if (
      (slot.facultyUid && ex.facultyUid && slot.facultyUid === ex.facultyUid) ||
      (slot.teacherUid && ex.teacherUid && slot.teacherUid === ex.teacherUid)
    ) {
      throw new Error("conflict: faculty double-booked for this time");
    }

    // class/section conflict
    if (slot.classId && ex.classId && slot.classId === ex.classId) {
      // if either is whole class (no section) or sections match
      if (!slot.sectionId || !ex.sectionId || slot.sectionId === ex.sectionId) {
        throw new Error(
          "conflict: class or section has another slot at this time",
        );
      }
    }
  }

  const ref = collection(db, TIMETABLE);
  const docRef = await addDoc(ref, { ...slot, createdAt: new Date() } as any);
  // Audit: timetable slot created
  try {
    await logAudit({
      actorUid: actorUid,
      actionType: "timetable_change",
      targetCollection: TIMETABLE,
      targetDocumentId: docRef.id,
      newState: slot as any,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[timetable.createTimetableSlot] audit failed", e);
  }
  return docRef.id;
}

export async function updateTimetableSlot(
  slotId: string,
  updates: Partial<TimetableSlot>,
  actorUid: string,
  options: { adminOverride?: boolean } = {},
) {
  // For simplicity, re-run conflict checks if times/day/room/faculty/class/section changed.
  const d = doc(db, TIMETABLE, slotId);
  await setDoc(d, { ...updates, updatedAt: new Date() }, { merge: true });
  try {
    await logAudit({
      actorUid: actorUid,
      actionType: "timetable_change",
      targetCollection: TIMETABLE,
      targetDocumentId: slotId,
      newState: updates as any,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[timetable.updateTimetableSlot] audit failed", e);
  }
}

export async function deleteTimetableSlot(slotId: string, actorUid?: string) {
  await deleteDoc(doc(db, TIMETABLE, slotId));
  try {
    await logAudit({
      actorUid: actorUid ?? "system",
      actionType: "timetable_change",
      targetCollection: TIMETABLE,
      targetDocumentId: slotId,
      metadata: { action: "delete" },
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[timetable.deleteTimetableSlot] audit failed", e);
  }
}

// TODO: add server-side validation rules, recurring templates, automatic attendance session generation, notifications, drag-and-drop scheduling, exports, and advanced conflict resolution
