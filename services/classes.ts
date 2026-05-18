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

const CLASSES = "classes";

export function subscribeClasses(
  departmentIdOrCb?: string | ((items: any[]) => void),
  cb?: (items: any[]) => void,
) {
  // signature compatibility: subscribeClasses(cb) or subscribeClasses(departmentId, cb)
  let departmentId: string | undefined;
  let callback: (items: any[]) => void;
  if (typeof departmentIdOrCb === "function") {
    callback = departmentIdOrCb as (items: any[]) => void;
    departmentId = undefined;
  } else {
    departmentId = departmentIdOrCb as string | undefined;
    callback = cb as (items: any[]) => void;
  }

  const qcol = departmentId
    ? query(collection(db, CLASSES), where("departmentId", "==", departmentId))
    : collection(db, CLASSES);

  const unsub = onSnapshot(
    qcol,
    (snap) => {
      callback(snapshotToList<any>(snap) as any[]);
    },
    (err) => {
      console.error("subscribeClasses", err);
      callback([]);
    },
  );
  return unsub;
}

export async function fetchClassesByDepartmentAndYear(
  departmentId: string,
  year?: number,
) {
  let q = collection(db, CLASSES) as any;
  if (departmentId && year != null) {
    q = query(
      collection(db, CLASSES),
      where("departmentId", "==", departmentId),
      where("year", "==", year),
    );
  } else if (departmentId) {
    q = query(
      collection(db, CLASSES),
      where("departmentId", "==", departmentId),
    );
  }
  const snap = await getDocs(q as any);
  return snapshotToList<any>(snap as any) as any[];
}

export async function addClass(
  docData: {
    departmentId: string;
    year: number;
    programme?: string;
    isActive?: boolean;
  },
  createdBy?: string,
) {
  const ref = collection(db, CLASSES);
  const d = await addDoc(ref, {
    ...docData,
    isActive: docData.isActive ?? true,
    createdAt: new Date(),
    createdBy: createdBy ?? null,
  } as any);
  try {
    await logAudit({
      actorUid: createdBy ?? "system",
      actionType: "other",
      targetCollection: CLASSES,
      targetDocumentId: d.id,
      newState: docData as any,
    });
  } catch (e) {
    console.warn("class.create audit failed", e);
  }
  return d.id;
}

export async function updateClass(
  id: string,
  updates: Partial<any>,
  updatedBy?: string,
) {
  await setDoc(doc(db, CLASSES, id), { ...updates, updatedAt: new Date() }, {
    merge: true,
  } as any);
  try {
    await logAudit({
      actorUid: updatedBy ?? "system",
      actionType: "other",
      targetCollection: CLASSES,
      targetDocumentId: id,
      newState: updates as any,
    });
  } catch (e) {
    console.warn("class.update audit failed", e);
  }
}

export async function deleteClass(id: string, deletedBy?: string) {
  // soft-delete pattern: set isActive=false
  await setDoc(
    doc(db, CLASSES, id),
    { isActive: false, deletedAt: new Date() },
    { merge: true } as any,
  );
  try {
    await logAudit({
      actorUid: deletedBy ?? "system",
      actionType: "other",
      targetCollection: CLASSES,
      targetDocumentId: id,
    });
  } catch (e) {
    console.warn("class.delete audit failed", e);
  }
}

export default {} as unknown;
