import { db } from "@/firebase/config";
import {
    collection,
    CollectionReference,
    query,
    Query,
    where,
} from "firebase/firestore";

export type RoleScope = {
  role: "admin" | "hod" | "faculty" | "student" | string;
  uid?: string;
  assignmentId?: string;
  departmentId?: string;
  classId?: string;
  sectionId?: string | null;
  facultyId?: string;
};

/**
 * Apply common scoping rules to a collection reference based on role and provided ids.
 * Ensures client never queries an unrestricted collection when rules require scoped access.
 */
export function applyScopeToCollection(
  collName: string,
  scope?: RoleScope,
): CollectionReference | Query {
  const base = collection(db, collName);

  // Admin may query entire collections
  if (!scope || scope.role === "admin") return base;

  // If an assignmentId is present, prefer strong assignment scoping
  if (scope.assignmentId)
    return query(base, where("assignmentId", "==", scope.assignmentId));

  // Department scoping (HODs and department-limited roles)
  if (scope.departmentId)
    return query(base, where("departmentId", "==", scope.departmentId));

  // Class/section scoping (students, class-wide views)
  if (scope.classId && scope.sectionId)
    return query(
      base,
      where("classId", "==", scope.classId),
      where("sectionId", "==", scope.sectionId),
    );
  if (scope.classId) return query(base, where("classId", "==", scope.classId));

  // Faculty scoping
  if (scope.facultyId)
    return query(base, where("facultyUid", "==", scope.facultyId));

  // Fallback to uid-based scoping for user-specific collections
  if (scope.uid) return query(base, where("uid", "==", scope.uid));

  // If we reach here, we cannot safely query the whole collection for non-admin.
  throw new Error(
    `insufficient-scope: cannot query collection ${collName} without scope`,
  );
}

// TODO: Add collection-specific mapping (e.g., users.department vs users.departments array)
// TODO: Add optimizations for combining multiple filters and indexes
