import { db } from "@/firebase/config";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import { snapshotToList } from "./firestore-helpers";

const CURRICULUM = "curriculum_subjects";

export async function fetchCurriculumSubjects(
  departmentId: string,
  year: number,
  semester: string,
) {
  const q = query(
    collection(db, CURRICULUM),
    where("departmentId", "==", departmentId),
    where("year", "==", year),
    where("semester", "==", semester),
  );
  const snap = await getDocs(q as any);
  return snapshotToList<any>(snap as any) as any[];
}

export async function addCurriculumSubject(
  departmentId: string,
  year: number,
  semester: string,
  subjectId: string,
) {
  // prevent duplicates
  const q = query(
    collection(db, CURRICULUM),
    where("departmentId", "==", departmentId),
    where("year", "==", year),
    where("semester", "==", semester),
    where("subjectId", "==", subjectId),
  );
  const snap = await getDocs(q as any);
  if (!snap.empty)
    throw new Error(
      "duplicate: curriculum subject already exists for this semester",
    );
  const ref = collection(db, CURRICULUM);
  const d = await addDoc(ref, {
    departmentId,
    year,
    semester,
    subjectId,
    isActive: true,
    createdAt: new Date(),
  } as any);
  return d.id;
}

export async function deleteCurriculumSubject(id: string) {
  await deleteDoc(doc(db, CURRICULUM, id));
}

export async function updateCurriculumSubject(
  id: string,
  updates: Partial<any>,
) {
  await setDoc(doc(db, CURRICULUM, id), { ...updates, updatedAt: new Date() }, {
    merge: true,
  } as any);
}

export default {} as unknown;
