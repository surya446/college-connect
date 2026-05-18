import { db } from "@/firebase/config";
import type { Note } from "@/types/firestore";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    query,
    where
} from "firebase/firestore";
import { snapshotToList } from "./firestore-helpers";
import { safeGetDocs, safeOnSnapshot } from "./firestore-safe";
import { applyScopeToCollection, RoleScope } from "./scoped-queries";

const NOTES = "notes";

export function subscribeToNotes(
  cb: (notes: Note[]) => void,
  scope?: RoleScope,
) {
  let coll: any;
  try {
    coll = applyScopeToCollection(NOTES, scope);
  } catch (e) {
    coll = collection(db, NOTES);
  }

  const unsub = safeOnSnapshot(
    coll as any,
    (snap: any) => {
      const list = snapshotToList<Note>(snap);
      cb(list as Note[]);
    },
    (err: any) => {
      console.error("[notes.subscribeToNotes]", err);
      cb([]);
    },
  );

  return unsub;
}

export async function fetchNotesByDepartment(
  departmentId: string,
): Promise<Note[]> {
  const q = query(
    collection(db, NOTES),
    where("departmentId", "==", departmentId),
  );
  const snap = await safeGetDocs(q as any);
  return snapshotToList<Note>(snap) as Note[];
}

export async function getNote(id: string): Promise<Note | null> {
  const d = doc(db, NOTES, id);
  const snap = await getDoc(d);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Note;
}

export async function createNote(payload: Omit<Note, "id" | "createdAt">) {
  const ref = collection(db, NOTES);
  const docRef = await addDoc(ref, payload as any);
  return docRef.id;
}

export async function deleteNote(id: string) {
  const ref = doc(db, NOTES, id);
  await deleteDoc(ref);
}

// TODO: support pagination, storage deletion, and permissions checks
