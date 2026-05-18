import { db } from "@/firebase/config";
import type { Department } from "@/types/firestore";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { snapshotToList } from "./firestore-helpers";

const DEPTS = "departments";

export function subscribeDepartments(cb: (items: Department[]) => void) {
  const unsub = onSnapshot(
    collection(db, DEPTS),
    (snap) => {
      cb(snapshotToList<Department>(snap) as Department[]);
    },
    (err) => {
      console.error("[departments.subscribeDepartments]", err);
      cb([]);
    },
  );

  return unsub;
}

export async function fetchDepartments(): Promise<Department[]> {
  const snap = await getDocs(collection(db, DEPTS));
  return snapshotToList<Department>(snap) as Department[];
}

// TODO: add create/update/delete, pagination, and caching
