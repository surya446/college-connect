import { db } from "@/firebase/config";
import type { DepartmentId, User, UserId } from "@/types/firestore";
import type { UserProfile } from "@/types/user-profile";
import { collection, doc, query, where } from "firebase/firestore";
import { snapshotToList } from "./firestore-helpers";
import { safeGetDocs, safeOnSnapshot } from "./firestore-safe";
import { fetchUserProfile as fetchUserProfileRaw } from "./user-profile";

const USERS = "users";

// TODO: Add a schema migration/converter layer to normalize legacy fields
// (e.g., `department` -> `departmentId`, `dept` -> `departmentId`, `subjectName` -> `name`)
// Consider Firestore data converters or backend migration scripts.

export async function getUserProfile(uid: UserId): Promise<UserProfile> {
  return fetchUserProfileRaw(uid);
}

export function subscribeToUser(uid: UserId, cb: (user: User | null) => void) {
  const d = doc(db, USERS, uid);
  return safeOnSnapshot(
    d as any,
    (snap: any) => {
      if (!snap.exists()) return cb(null);
      cb({ id: snap.id, ...(snap.data() as any) } as User);
    },
    (err: any) => {
      console.error("[users.subscribeToUser]", err);
      cb(null);
    },
  );
}

export function subscribeStudentsByDeptYear(
  departmentId: DepartmentId,
  year: string | number,
  cb: (users: User[]) => void,
) {
  // Try canonical `departmentId` field first, fallback to legacy `department`
  const q1 = query(
    collection(db, USERS),
    where("role", "==", "student"),
    where("departmentId", "==", departmentId),
    where("year", "==", year),
  );
  console.debug(
    "[users.subscribeStudentsByDeptYear] attaching listener for departmentId=",
    departmentId,
    "year=",
    year,
  );
  return safeOnSnapshot(
    q1 as any,
    (snap: any) => {
      const list = snapshotToList<User>(snap) as any[];
      if (!list || list.length === 0) {
        // fallback to legacy field
        console.debug(
          "[users.subscribeStudentsByDeptYear] empty for departmentId, trying legacy `department` field",
        );
        const q2 = query(
          collection(db, USERS),
          where("role", "==", "student"),
          where("department", "==", departmentId),
          where("year", "==", year),
        );
        return safeOnSnapshot(
          q2 as any,
          (snap2: any) => cb(snapshotToList<User>(snap2) as User[]),
          (err2: any) => {
            console.error(
              "[users.subscribeStudentsByDeptYear - fallback]",
              err2,
            );
            cb([]);
          },
        );
      }
      // Normalize fields
      const normalized = list.map((src) => {
        const out: any = { ...(src as any) };
        if (!out.departmentId && (out.department || out.dept))
          out.departmentId = out.department ?? out.dept;
        if (!out.uid && out.id) out.uid = out.id;
        return out as User;
      });
      cb(normalized as User[]);
    },
    (err: any) => {
      console.error("[users.subscribeStudentsByDeptYear]", err);
      cb([]);
    },
  );
}

export function subscribeStudentsByClassSection(
  classId: string,
  sectionId: string | null,
  cb: (users: User[]) => void,
) {
  // sectionId may be null (whole class)
  const q = sectionId
    ? query(
        collection(db, USERS),
        where("role", "==", "student"),
        where("classId", "==", classId),
        where("sectionId", "==", sectionId),
      )
    : query(
        collection(db, USERS),
        where("role", "==", "student"),
        where("classId", "==", classId),
      );
  return safeOnSnapshot(
    q as any,
    (snap: any) => {
      cb(snapshotToList<User>(snap) as User[]);
    },
    (err: any) => {
      console.error("[users.subscribeStudentsByClassSection]", err);
      cb([]);
    },
  );
}

/** Fetch all faculty users (non-realtime). Uses safeGetDocs to handle permissions. */
export async function fetchFacultyUsers(): Promise<User[]> {
  // Log intended filter for debugging schema/permission issues
  console.debug(
    "[users.fetchFacultyUsers] executing filter: role == 'faculty'",
  );
  const q = query(collection(db, USERS), where("role", "==", "faculty"));
  const snap = await safeGetDocs(q as any);
  const raw = snapshotToList<User>(snap) as any[];
  const normalized = raw.map((src) => {
    console.debug("[users.fetchFacultyUsers] doc raw:", src);
    const out: any = { ...src };
    if (!out.departmentId && (out.department || out.dept)) {
      out.departmentId = out.department ?? out.dept;
    }
    if (!out.uid && out.id) out.uid = out.id;
    // Normalize name fields: prefer `name`, fall back to displayName/ preferredName / fullName
    if (!out.name)
      out.name =
        out.displayName ??
        out.preferredName ??
        out.fullName ??
        out.facultyName ??
        out.name;
    if (out.role && typeof out.role === "string")
      out.role = out.role.toLowerCase();
    return out as User;
  });
  return normalized as User[];
}

/** Realtime subscription for faculty users. */
export function subscribeFacultyUsers(cb: (users: User[]) => void) {
  const filterDesc = "role == 'faculty'";
  console.debug(
    `[users.subscribeFacultyUsers] attaching realtime listener with filter: ${filterDesc}`,
  );
  const q = query(collection(db, USERS), where("role", "==", "faculty"));
  return safeOnSnapshot(
    q as any,
    (snap: any) => {
      const list = snapshotToList<User>(snap) as any[];
      console.debug(
        "[users.subscribeFacultyUsers] snapshot size=",
        list.length,
      );
      list.forEach((d, i) =>
        console.debug(`[users.subscribeFacultyUsers] doc[${i}] raw:`, d),
      );
      const normalized = list.map((src) => {
        const out: any = { ...(src as any) };
        if (!out.departmentId && (out.department || out.dept))
          out.departmentId = out.department ?? out.dept;
        if (!out.uid && out.id) out.uid = out.id;
        // Normalize name and role
        if (!out.name)
          out.name =
            out.displayName ??
            out.preferredName ??
            out.fullName ??
            out.facultyName ??
            out.name;
        if (out.role && typeof out.role === "string")
          out.role = out.role.toLowerCase();
        return out as User;
      });
      cb(normalized as User[]);
    },
    (err: any) => {
      console.error("[users.subscribeFacultyUsers]", err);
      cb([]);
    },
  );
}

// TODO: add paging, caching, and search helpers
