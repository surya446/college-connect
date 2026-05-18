import { db } from "@/firebase/config";
import type { FacultyAssignment } from "@/types/firestore";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import { logAudit } from "./audit";
import { snapshotToList } from "./firestore-helpers";

const ASSIGNMENTS = "faculty_assignments";

export function subscribeFacultyAssignments(
  facultyUid: string,
  cb: (items: FacultyAssignment[]) => void,
) {
  const q = query(
    collection(db, ASSIGNMENTS),
    where("facultyUid", "==", facultyUid),
  );
  const unsub = onSnapshot(
    q,
    (snap) =>
      cb(snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[]),
    (err) => {
      console.error("[faculty_assignments.subscribe]", err);
      cb([]);
    },
  );
  return unsub;
}

export async function fetchAssignmentsForFaculty(
  facultyUid: string,
): Promise<FacultyAssignment[]> {
  const q = query(
    collection(db, ASSIGNMENTS),
    where("facultyUid", "==", facultyUid),
  );
  const snap = await getDocs(q);
  return snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[];
}

export async function fetchAllAssignments(): Promise<FacultyAssignment[]> {
  const snap = await getDocs(collection(db, ASSIGNMENTS));
  return snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[];
}

export async function fetchAssignmentsByClass(
  classId: string,
  sectionId?: string | null,
) {
  const q = sectionId
    ? query(
        collection(db, ASSIGNMENTS),
        where("classId", "==", classId),
        where("sectionId", "==", sectionId),
      )
    : query(collection(db, ASSIGNMENTS), where("classId", "==", classId));
  const snap = await getDocs(q);
  return snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[];
}

export async function fetchAssignmentsByDepartment(
  departmentId: string,
): Promise<FacultyAssignment[]> {
  const q = query(
    collection(db, ASSIGNMENTS),
    where("departmentId", "==", departmentId),
  );
  const snap = await getDocs(q);
  return snapshotToList<FacultyAssignment>(snap) as FacultyAssignment[];
}

export async function createAssignment(
  assign: Omit<FacultyAssignment, "id" | "createdAt"> & { createdBy?: string },
) {
  // Prevent duplicate same curriculum subject assigned to same class/section+semester
  const existingQ = query(
    collection(db, ASSIGNMENTS),
    where("curriculumSubjectId", "==", assign.curriculumSubjectId ?? ""),
    where("classId", "==", assign.classId ?? ""),
    where("sectionId", "==", assign.sectionId ?? null),
    where("semester", "==", assign.semester ?? ""),
  );
  const existsSnap = await getDocs(existingQ);
  if (!existsSnap.empty) {
    throw new Error(
      "duplicate: this curriculum subject is already assigned to the selected class/section/semester",
    );
  }

  // Basic faculty overload check: count current assignments in same semester/year
  const facultyQ = query(
    collection(db, ASSIGNMENTS),
    where("facultyUid", "==", assign.facultyUid),
    where("academicYear", "==", assign.academicYear ?? ""),
    where("semester", "==", assign.semester ?? ""),
  );
  const facSnap = await getDocs(facultyQ);
  if (facSnap.size >= 8) {
    // soft limit; admins can bypass when needed
    throw new Error("workload: faculty appears to be overloaded for this term");
  }

  const ref = collection(db, ASSIGNMENTS);
  const docRef = await addDoc(ref, {
    ...assign,
    createdAt: new Date(),
    createdBy: assign.createdBy ?? null,
  } as any);
  // Audit: created assignment
  try {
    await logAudit({
      actorUid: assign.createdBy ?? "system",
      actionType: "faculty_assignment",
      targetCollection: ASSIGNMENTS,
      targetDocumentId: docRef.id,
      newState: assign as any,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[faculty_assignments.createAssignment] audit failed", e);
  }
  return docRef.id;
}

export async function updateAssignment(
  id: string,
  updates: Partial<FacultyAssignment>,
) {
  const d = doc(db, ASSIGNMENTS, id);
  await setDoc(d, { ...updates, updatedAt: new Date() }, { merge: true });
  try {
    await logAudit({
      actorUid: "system",
      actionType: "faculty_assignment",
      targetCollection: ASSIGNMENTS,
      targetDocumentId: id,
      newState: updates as any,
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[faculty_assignments.updateAssignment] audit failed", e);
  }
}

export async function deleteAssignment(id: string) {
  await deleteDoc(doc(db, ASSIGNMENTS, id));
  try {
    await logAudit({
      actorUid: "system",
      actionType: "faculty_assignment",
      targetCollection: ASSIGNMENTS,
      targetDocumentId: id,
      metadata: { action: "delete" },
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[faculty_assignments.deleteAssignment] audit failed", e);
  }
}

// TODO: add server-side rules to prevent duplicates, implement workload analytics and balancing
