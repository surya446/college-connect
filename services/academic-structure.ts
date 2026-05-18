import type { ClassDoc, DepartmentId, Section } from "@/types/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";
import { snapshotToList } from "./firestore-helpers";

/**
 * Fetch distinct years (class.year) available for a department.
 */
export async function fetchYearsByDepartment(
  db: any,
  departmentId: DepartmentId,
) {
  // Query classes for department and derive unique years
  const q = query(
    collection(db, "classes") as any,
    where("departmentId", "==", departmentId),
  );
  const snap = await getDocs(q as any);
  const classes = snapshotToList<ClassDoc>(snap as any) as ClassDoc[];
  const years = Array.from(new Set((classes || []).map((c) => c.year))).sort(
    (a, b) => a - b,
  );
  return years;
}

/**
 * Fetch sections for a department+year by resolving classes for that department+year
 * and returning their sections.
 */
export async function fetchSectionsByDepartmentAndYear(
  db: any,
  departmentId: DepartmentId,
  year: number,
) {
  // first find classes for dept+year
  const classQ = query(
    collection(db, "classes") as any,
    where("departmentId", "==", departmentId),
    where("year", "==", year),
  );
  const classSnap = await getDocs(classQ as any);
  const classes = snapshotToList<ClassDoc>(classSnap as any) as ClassDoc[];
  const classIds = (classes || []).map((c) => c.id).filter(Boolean) as string[];
  if (classIds.length === 0) return [] as Section[];
  // query sections where classId in classIds (Firestore doesn't support `in` with long lists but works for small arrays)
  const sections: Section[] = [];
  for (const cid of classIds) {
    const sQ = query(
      collection(db, "sections") as any,
      where("classId", "==", cid),
    );
    const sSnap = await getDocs(sQ as any);
    const secs = snapshotToList<Section>(sSnap as any) as Section[];
    sections.push(...(secs || []));
  }
  return sections;
}

export default {} as unknown;
