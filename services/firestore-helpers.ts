import { DocumentData, QuerySnapshot } from "firebase/firestore";
console.debug("[import] services/firestore-helpers.ts");

/** Convert a Firestore snapshot to a typed list with ids included */
export function snapshotToList<T = any>(
  snap: QuerySnapshot<DocumentData>,
): (T & { id: string })[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

/** Shallow safe getter for nested fields */
export function safeGet<T>(value: T | undefined | null, fallback: T): T {
  return value == null ? fallback : value;
}

// TODO: add typed Firestore converters and serverTimestamp helpers
