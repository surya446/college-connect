import { db } from "@/firebase/config";
import {
    collection,
    DocumentData,
    limit,
    orderBy,
    query,
    where
} from "firebase/firestore";
import { safeGetDocs, safeOnSnapshot } from "./firestore-safe";
import { applyScopeToCollection, RoleScope } from "./scoped-queries";

export type OverviewCounts = {
  totalStudents: number;
  totalFaculty: number;
  departments: number;
  activeClasses: number;
  timetableSlots: number;
  activeComplaints: number;
};

export async function fetchOverviewCounts(
  scope?: RoleScope,
): Promise<OverviewCounts> {
  // Count users by role
  const usersRef = applyScopeToCollection("users", scope);
  const studentsQ = query(usersRef as any, where("role", "==", "student"));
  const facultyQ = query(usersRef as any, where("role", "==", "faculty"));

  const deptColl = applyScopeToCollection("departments", scope);
  const classesColl = applyScopeToCollection("classes", scope);
  const timetableColl = applyScopeToCollection("timetable", scope);
  const complaintsColl = applyScopeToCollection("complaints", scope);

  const [studentsSnap, facultySnap, deptSnap, classesSnap, ttSnap, compSnap] =
    await Promise.all([
      safeGetDocs(studentsQ as any),
      safeGetDocs(facultyQ as any),
      safeGetDocs(deptColl as any),
      safeGetDocs(classesColl as any),
      safeGetDocs(timetableColl as any),
      safeGetDocs(complaintsColl as any),
    ]);

  // active complaints: non-resolved
  const activeComplaints = compSnap.docs.filter((d: any) => {
    const s = (d.data() as any).status;
    return s !== "resolved" && s !== "rejected";
  }).length;

  return {
    totalStudents: studentsSnap.size,
    totalFaculty: facultySnap.size,
    departments: deptSnap.size,
    activeClasses: classesSnap.size,
    timetableSlots: ttSnap.size,
    activeComplaints,
  };
}

export function subscribeOverviewRealtime(
  cb: (counts: OverviewCounts) => void,
  scope?: RoleScope,
) {
  // Build scoped subscriptions for non-admins to avoid unrestricted collection reads.
  const usersColl = applyScopeToCollection("users", scope);
  const timetableColl = applyScopeToCollection("timetable", scope);
  const complaintsColl = applyScopeToCollection("complaints", scope);
  const departmentsColl = applyScopeToCollection("departments", scope);
  const classesColl = applyScopeToCollection("classes", scope);

  const unsubUsers = safeOnSnapshot(usersColl as any, async () => {
    cb(await fetchOverviewCounts(scope));
  });

  const unsubTimetable = safeOnSnapshot(timetableColl as any, async () => {
    cb(await fetchOverviewCounts(scope));
  });

  const unsubComplaints = safeOnSnapshot(complaintsColl as any, async () => {
    cb(await fetchOverviewCounts(scope));
  });

  const unsubDepartments = safeOnSnapshot(departmentsColl as any, async () => {
    cb(await fetchOverviewCounts(scope));
  });

  const unsubClasses = safeOnSnapshot(classesColl as any, async () => {
    cb(await fetchOverviewCounts(scope));
  });

  return () => {
    unsubUsers();
    unsubTimetable();
    unsubComplaints();
    unsubDepartments();
    unsubClasses();
  };
}

export function subscribeRecentAudit(
  cb: (items: DocumentData[]) => void,
  limitCount = 20,
) {
  const q = query(
    collection(db, "audit_logs"),
    orderBy("timestamp", "desc" as any),
    limit(limitCount),
  );
  const unsub = safeOnSnapshot(q as any, (snap) =>
    cb(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }))),
  );
  return unsub;
}

// TODO: Add efficient aggregate counters (collection group or Cloud Function) to avoid full collection scans
// TODO: Implement specialized critical alert detectors (attendance heatmaps, timetable conflict detectors)
