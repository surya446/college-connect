import { db } from "@/firebase/config";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import { logAudit } from "./audit";
import { snapshotToList } from "./firestore-helpers";

const SECTIONS = "sections";

export function subscribeSections(
  classIdOrCb?: string | ((items: any[]) => void),
  cb?: (items: any[]) => void,
) {
  // signature compatibility: subscribeSections(cb) or subscribeSections(classId, cb)
  let classId: string | undefined;
  let callback: (items: any[]) => void;
  if (typeof classIdOrCb === "function") {
    callback = classIdOrCb as (items: any[]) => void;
    classId = undefined;
  } else {
    classId = classIdOrCb as string | undefined;
    callback = cb as (items: any[]) => void;
  }

  const qcol = classId
    ? query(collection(db, SECTIONS), where("classId", "==", classId))
    : collection(db, SECTIONS);

  const unsub = onSnapshot(
    qcol,
    (snap) => {
      const list = snapshotToList<any>(snap) as any[];
      if (callback) callback(list);
    },
    (err) => {
      console.error("subscribeSections", err);
      if (callback) callback([]);
    },
  );
  return unsub;
}

export async function fetchSectionsByClass(classId: string) {
  const q = query(collection(db, SECTIONS), where("classId", "==", classId));
  const snap = await getDocs(q as any);
  return snapshotToList<any>(snap as any) as any[];
}

export async function addSection(
  section: {
    classId: string;
    name: string;
    capacity?: number;
    isActive?: boolean;
  },
  createdBy?: string,
) {
  const ref = collection(db, SECTIONS);
  const d = await addDoc(ref, {
    ...section,
    isActive: section.isActive ?? true,
    createdAt: new Date(),
    createdBy: createdBy ?? null,
  } as any);
  try {
    await logAudit({
      actorUid: createdBy ?? "system",
      actionType: "other",
      targetCollection: SECTIONS,
      targetDocumentId: d.id,
      newState: section as any,
    });
  } catch (e) {
    console.warn("section.create audit failed", e);
  }
  return d.id;
}

export async function updateSection(
  id: string,
  updates: Partial<any>,
  updatedBy?: string,
) {
  await setDoc(doc(db, SECTIONS, id), { ...updates, updatedAt: new Date() }, {
    merge: true,
  } as any);
  try {
    await logAudit({
      actorUid: updatedBy ?? "system",
      actionType: "other",
      targetCollection: SECTIONS,
      targetDocumentId: id,
      newState: updates as any,
    });
  } catch (e) {
    console.warn("section.update audit failed", e);
  }
}

export async function deleteSection(id: string, deletedBy?: string) {
  await setDoc(
    doc(db, SECTIONS, id),
    { isActive: false, deletedAt: new Date() },
    { merge: true } as any,
  );
  try {
    await logAudit({
      actorUid: deletedBy ?? "system",
      actionType: "other",
      targetCollection: SECTIONS,
      targetDocumentId: id,
    });
  } catch (e) {
    console.warn("section.delete audit failed", e);
  }
}

export default {} as unknown;
