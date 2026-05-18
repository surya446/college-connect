import { auth, db, functions } from "@/firebase/config";
import type { UserId } from "@/types/firestore";
import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { logAudit } from "./audit";
import { snapshotToList } from "./firestore-helpers";
import { safeOnSnapshot } from "./firestore-safe";
import { applyScopeToCollection, RoleScope } from "./scoped-queries";
console.debug("[import] services/admin-users.ts");

const USERS = "users";

async function fallbackCallAdminCreateUserDirect(payload: any) {
  // Direct POST to the region-specific function endpoint using ID token
  const region = process.env.EXPO_PUBLIC_FUNCTIONS_REGION || "";
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";
  if (!region || !projectId) {
    console.warn("[admin-users.fallback] missing region/projectId", {
      region,
      projectId,
    });
    throw new Error("Missing FUNCTIONS_REGION or PROJECT_ID for fallback call");
  }

  const uid = auth.currentUser?.uid ?? null;
  const idToken = uid ? await auth.currentUser!.getIdToken() : null;
  if (!idToken) {
    console.warn("[admin-users.fallback] no idToken available");
    throw new Error("No idToken available");
  }

  const url = `https://${region}-${projectId}.cloudfunctions.net/adminCreateUser`;
  console.debug("[admin-users.fallback] POST", url);

  const body = JSON.stringify({ data: payload });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };

  try {
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();
    console.debug(
      "[admin-users.fallback] raw response status:",
      res.status,
      "body:",
      text,
    );
    // Try parse JSON
    try {
      const json = JSON.parse(text);
      // Callable responses wrap data under "result" or "data" depending on runtime; return raw
      return json;
    } catch (e) {
      return { raw: text, status: res.status };
    }
  } catch (e) {
    console.error("[admin-users.fallback] fetch failed", e);
    throw e;
  }
}

export async function checkDuplicateRoll(rollNumber: string) {
  const q = query(collection(db, USERS), where("studentId", "==", rollNumber));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function checkDuplicateEmployeeId(empId: string) {
  const q = query(collection(db, USERS), where("facultyId", "==", empId));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createStudentAccount(
  profile: any & { password: string; createdBy?: UserId },
) {
  // Expect a callable Cloud Function `adminCreateUser` to create Auth user and return uid
  console.debug(
    "[admin-users.createStudentAccount] invoking callable adminCreateUser",
  );
  console.debug(
    "[admin-users.createStudentAccount] functions available:",
    Boolean(functions),
    "EXPO_PUBLIC_FUNCTIONS_REGION=",
    process.env.EXPO_PUBLIC_FUNCTIONS_REGION,
  );
  if (__DEV__) {
    try {
      const uid = auth.currentUser?.uid ?? null;
      console.debug("[admin-users.createStudentAccount] currentUser.uid:", uid);
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        console.debug(
          "[admin-users.createStudentAccount] idToken present: len=",
          token?.length ?? 0,
        );
      } else {
        console.debug("[admin-users.createStudentAccount] no auth.currentUser");
      }
    } catch (e) {
      console.warn(
        "[admin-users.createStudentAccount] failed to read idToken",
        e,
      );
    }
  }
  const fn = httpsCallable(functions, "adminCreateUser");
  const payload = {
    email: profile.email,
    password: profile.password,
    role: "student",
    profile: {
      displayName: profile.displayName ?? profile.name,
      studentId: profile.studentId,
      department: profile.department,
      classId: profile.classId,
      sectionId: profile.sectionId,
      semester: profile.semester,
      mobile: profile.mobile,
    },
  };
  let res: any;
  try {
    res = (await fn(payload)) as any;
  } catch (err: any) {
    console.error(
      "[admin-users.createStudentAccount] adminCreateUser callable failed",
      err,
    );
    if (
      err?.code === "functions/not-found" ||
      err?.message?.includes("not-found")
    ) {
      console.error(
        '[admin-users.createStudentAccount] callable not found. Check that the Cloud Function "adminCreateUser" is exported and deployed in the same Firebase project and region. If you use a non-default region, set EXPO_PUBLIC_FUNCTIONS_REGION to that region.',
      );
    }
    // If we got unauthenticated from the SDK, attempt a direct POST with the ID token
    if (
      err?.code === "unauthenticated" ||
      err?.message?.toLowerCase?.()?.includes("unauthenticated")
    ) {
      try {
        const fb = await fallbackCallAdminCreateUserDirect(payload);
        console.debug(
          "[admin-users.createStudentAccount] fallback response:",
          fb,
        );
      } catch (fbErr) {
        console.warn(
          "[admin-users.createStudentAccount] fallback failed",
          fbErr,
        );
      }
    }
    // rethrow for upstream handling
    throw err;
  }
  const uid = res?.data?.uid as string | undefined;
  if (!uid) throw new Error("Failed to create auth user");

  console.debug(
    `[admin-users.createStudentAccount] auth user created uid=${uid}`,
  );

  console.debug(
    `[admin-users.createStudentAccount] Firestore setDoc starting for uid=${uid}`,
  );

  // Create Firestore user doc; if this fails, attempt rollback (delete auth user)
  const docRef = doc(db, USERS, uid);
  try {
    await setDoc(docRef, {
      uid,
      displayName: profile.displayName ?? profile.name ?? null,
      email: profile.email,
      role: "student",
      departmentId: profile.department ?? profile.departmentId ?? null,
      classId: profile.classId ?? profile.classIds ?? null,
      sectionId: profile.sectionId ?? profile.section ?? null,
      rollNumber: profile.studentId ?? profile.rollNumber ?? null,
      year: profile.year ?? null,
      mobile: profile.mobile ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: profile.createdBy ?? null,
    } as any);

    // Audit: student account created
    try {
      await logAudit({
        actorUid: profile.createdBy ?? "system",
        actionType: "user_account",
        targetCollection: USERS,
        targetDocumentId: uid,
        newState: { role: "student", studentId: profile.studentId } as any,
        clientGenerated: true,
      });
    } catch (e) {
      console.warn("[admin-users.createStudentAccount] audit failed", e);
    }

    console.debug(
      `[admin-users.createStudentAccount] firestore profile created uid=${uid}`,
    );
    return uid;
  } catch (writeErr) {
    console.error(
      `[admin-users.createStudentAccount] failed to write profile for uid=${uid}`,
      writeErr,
    );
    // Attempt rollback: delete created Auth user via Cloud Function
    try {
      const delFn = httpsCallable(functions, "adminDeleteUser");
      await delFn({ uid });
      console.warn(
        `[admin-users.createStudentAccount] rolled back auth user uid=${uid}`,
      );
    } catch (delErr) {
      console.error(
        `[admin-users.createStudentAccount] rollback failed for uid=${uid}`,
        delErr,
      );
      // If rollback fails, consider flagging the account for manual cleanup
    }
    throw writeErr;
  }
}

export async function createFacultyAccount(
  profile: any & { password: string; createdBy?: UserId },
) {
  console.debug(
    "[admin-users.createFacultyAccount] invoking callable adminCreateUser",
  );
  console.debug(
    "[admin-users.createFacultyAccount] functions available:",
    Boolean(functions),
    "EXPO_PUBLIC_FUNCTIONS_REGION=",
    process.env.EXPO_PUBLIC_FUNCTIONS_REGION,
  );
  if (__DEV__) {
    try {
      const uid = auth.currentUser?.uid ?? null;
      console.debug("[admin-users.createFacultyAccount] currentUser.uid:", uid);
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        console.debug(
          "[admin-users.createFacultyAccount] idToken present: len=",
          token?.length ?? 0,
        );
      } else {
        console.debug("[admin-users.createFacultyAccount] no auth.currentUser");
      }
    } catch (e) {
      console.warn(
        "[admin-users.createFacultyAccount] failed to read idToken",
        e,
      );
    }
  }
  const fn = httpsCallable(functions, "adminCreateUser");
  const roleToCreate = (profile.role as string) ?? "faculty";
  const payload = {
    email: profile.email,
    password: profile.password,
    role: roleToCreate,
    profile: {
      displayName: profile.displayName ?? (profile as any).name,
      facultyId: profile.facultyId,
      department: profile.department ?? profile.departmentId,
      designation: profile.designation,
      mobile: profile.mobile,
    },
  };
  let res: any;
  try {
    res = (await fn(payload)) as any;
  } catch (err: any) {
    console.error(
      "[admin-users.createFacultyAccount] adminCreateUser callable failed",
      err,
    );
    if (
      err?.code === "functions/not-found" ||
      err?.message?.includes("not-found")
    ) {
      console.error(
        '[admin-users.createFacultyAccount] callable not found. Check that the Cloud Function "adminCreateUser" is exported and deployed in the same Firebase project and region. If you use a non-default region, set EXPO_PUBLIC_FUNCTIONS_REGION to that region.',
      );
    }
    if (
      err?.code === "unauthenticated" ||
      err?.message?.toLowerCase?.()?.includes("unauthenticated")
    ) {
      try {
        const fb = await fallbackCallAdminCreateUserDirect(payload);
        console.debug(
          "[admin-users.createFacultyAccount] fallback response:",
          fb,
        );
      } catch (fbErr) {
        console.warn(
          "[admin-users.createFacultyAccount] fallback failed",
          fbErr,
        );
      }
    }
    throw err;
  }
  const uid = res?.data?.uid as string | undefined;
  if (!uid) throw new Error("Failed to create auth user");

  console.debug(
    `[admin-users.createFacultyAccount] auth user created uid=${uid}`,
  );

  console.debug(
    `[admin-users.createFacultyAccount] Firestore setDoc starting for uid=${uid}`,
  );

  const docRef = doc(db, USERS, uid);
  try {
    await setDoc(docRef, {
      uid,
      displayName: profile.displayName ?? (profile as any).name ?? null,
      email: profile.email,
      role: roleToCreate,
      departmentId: profile.department ?? profile.departmentId ?? null,
      employeeId: profile.facultyId ?? null,
      designation: profile.designation ?? null,
      mobile: profile.mobile ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: profile.createdBy ?? null,
    } as any);

    // Audit: faculty account created
    try {
      await logAudit({
        actorUid: profile.createdBy ?? "system",
        actionType: "user_account",
        targetCollection: USERS,
        targetDocumentId: uid,
        newState: { role: "faculty", facultyId: profile.facultyId } as any,
        clientGenerated: true,
      });
    } catch (e) {
      console.warn("[admin-users.createFacultyAccount] audit failed", e);
    }

    console.debug(
      `[admin-users.createFacultyAccount] firestore profile created uid=${uid}`,
    );
    return uid;
  } catch (writeErr) {
    console.error(
      `[admin-users.createFacultyAccount] failed to write profile for uid=${uid}`,
      writeErr,
    );
    try {
      const delFn = httpsCallable(functions, "adminDeleteUser");
      await delFn({ uid });
      console.warn(
        `[admin-users.createFacultyAccount] rolled back auth user uid=${uid}`,
      );
    } catch (delErr) {
      console.error(
        `[admin-users.createFacultyAccount] rollback failed for uid=${uid}`,
        delErr,
      );
    }
    throw writeErr;
  }
}

export async function createHodAccount(
  profile: any & { password: string; createdBy?: UserId },
) {
  console.debug(
    "[admin-users.createHodAccount] invoking callable adminCreateUser",
  );
  console.debug(
    "[admin-users.createHodAccount] functions available:",
    Boolean(functions),
    "EXPO_PUBLIC_FUNCTIONS_REGION=",
    process.env.EXPO_PUBLIC_FUNCTIONS_REGION,
  );
  if (__DEV__) {
    try {
      const uid = auth.currentUser?.uid ?? null;
      console.debug("[admin-users.createHodAccount] currentUser.uid:", uid);
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        console.debug(
          "[admin-users.createHodAccount] idToken present: len=",
          token?.length ?? 0,
        );
      } else {
        console.debug("[admin-users.createHodAccount] no auth.currentUser");
      }
    } catch (e) {
      console.warn("[admin-users.createHodAccount] failed to read idToken", e);
    }
  }
  const fn = httpsCallable(functions, "adminCreateUser");
  const payload = {
    email: profile.email,
    password: profile.password,
    role: "hod",
    profile: {
      displayName: profile.displayName ?? profile.name,
      departments: profile.departments,
      mobile: profile.mobile,
    },
  };
  let res: any;
  try {
    res = (await fn(payload)) as any;
  } catch (err: any) {
    console.error(
      "[admin-users.createHodAccount] adminCreateUser callable failed",
      err,
    );
    if (
      err?.code === "functions/not-found" ||
      err?.message?.includes("not-found")
    ) {
      console.error(
        '[admin-users.createHodAccount] callable not found. Check that the Cloud Function "adminCreateUser" is exported and deployed in the same Firebase project and region. If you use a non-default region, set EXPO_PUBLIC_FUNCTIONS_REGION to that region.',
      );
    }
    if (
      err?.code === "unauthenticated" ||
      err?.message?.toLowerCase?.()?.includes("unauthenticated")
    ) {
      try {
        const fb = await fallbackCallAdminCreateUserDirect(payload);
        console.debug("[admin-users.createHodAccount] fallback response:", fb);
      } catch (fbErr) {
        console.warn("[admin-users.createHodAccount] fallback failed", fbErr);
      }
    }
    throw err;
  }
  const uid = res?.data?.uid as string | undefined;
  if (!uid) throw new Error("Failed to create auth user");

  console.debug(`[admin-users.createHodAccount] auth user created uid=${uid}`);

  console.debug(
    `[admin-users.createHodAccount] Firestore setDoc starting for uid=${uid}`,
  );

  const docRef = doc(db, USERS, uid);
  try {
    await setDoc(docRef, {
      uid,
      displayName: profile.displayName ?? profile.name ?? null,
      email: profile.email,
      role: "hod",
      departments: profile.departments ?? [],
      mobile: profile.mobile ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: profile.createdBy ?? null,
    } as any);

    // Audit: HOD account created
    try {
      await logAudit({
        actorUid: profile.createdBy ?? "system",
        actionType: "user_account",
        targetCollection: USERS,
        targetDocumentId: uid,
        newState: { role: "hod", departments: profile.departments } as any,
        clientGenerated: true,
      });
    } catch (e) {
      console.warn("[admin-users.createHodAccount] audit failed", e);
    }

    console.debug(
      `[admin-users.createHodAccount] firestore profile created uid=${uid}`,
    );
    return uid;
  } catch (writeErr) {
    console.error(
      `[admin-users.createHodAccount] failed to write profile for uid=${uid}`,
      writeErr,
    );
    try {
      const delFn = httpsCallable(functions, "adminDeleteUser");
      await delFn({ uid });
      console.warn(
        `[admin-users.createHodAccount] rolled back auth user uid=${uid}`,
      );
    } catch (delErr) {
      console.error(
        `[admin-users.createHodAccount] rollback failed for uid=${uid}`,
        delErr,
      );
    }
    throw writeErr;
  }
}

export async function resetUserPassword(uid: string, newPassword: string) {
  const fn = httpsCallable(functions, "adminResetPassword");
  const res = await fn({ uid, newPassword });
  try {
    await logAudit({
      actorUid: "system",
      actionType: "user_account",
      targetCollection: USERS,
      targetDocumentId: uid,
      metadata: { action: "reset_password" },
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[admin-users.resetUserPassword] audit failed", e);
  }
  return res.data;
}

export async function setUserStatus(
  uid: string,
  status: "active" | "inactive" | "suspended",
  adminUid?: UserId,
) {
  // update Firestore user doc status
  const d = doc(db, USERS, uid);
  await setDoc(
    d,
    { status, updatedAt: new Date(), updatedBy: adminUid ?? null },
    { merge: true } as any,
  );
  try {
    await logAudit({
      actorUid: adminUid ?? "system",
      actionType: "user_account",
      targetCollection: USERS,
      targetDocumentId: uid,
      metadata: { action: "set_status", status },
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[admin-users.setUserStatus] audit failed", e);
  }
}

export async function deleteUserAccount(uid: string) {
  // Cloud Function to delete auth user and then remove Firestore doc
  const fn = httpsCallable(functions, "adminDeleteUser");
  await fn({ uid });
  try {
    await logAudit({
      actorUid: "system",
      actionType: "user_account",
      targetCollection: USERS,
      targetDocumentId: uid,
      metadata: { action: "delete" },
      clientGenerated: true,
    });
  } catch (e) {
    console.warn("[admin-users.deleteUserAccount] audit failed", e);
  }
}

export function subscribeUsers(
  filter: { role?: string; department?: string } | null,
  cb: (users: any[]) => void,
  scope?: RoleScope,
) {
  // Simple subscription for small datasets; implement pagination for production
  // Build a scoped collection/query rather than querying entire collection
  let base: any;
  try {
    base = applyScopeToCollection(USERS, scope);
  } catch (e) {
    // Fall back to explicit query if scope not provided but filter restricts
    base = collection(db, USERS);
  }

  let q: any = base;
  if (filter?.role) q = query(q, where("role", "==", filter.role));
  if (filter?.department) {
    console.debug(
      "[admin-users.subscribeUsers] applying department filter (may be `department` or `departmentId`):",
      filter.department,
    );
    // use legacy `department` filter by default; returned docs will be normalized
    q = query(q, where("department", "==", filter.department));
  }

  const unsub = safeOnSnapshot(
    q as any,
    (snap: any) => {
      const list = snapshotToList(snap) as any[];
      // normalize departmentId and uid fields for consumers
      const normalized = list.map((src) => {
        const out: any = { ...src };
        if (!out.departmentId && (out.department || out.dept))
          out.departmentId = out.department ?? out.dept;
        if (!out.uid && out.id) out.uid = out.id;
        return out;
      });
      cb(normalized as any[]);
    },
    (err: any) => {
      console.error("[admin-users.subscribe]", err);
      cb([]);
    },
  );
  return unsub;
}

// TODO: bulk CSV import, automated onboarding, audit logs, role escalation approvals, identity verification
// Additional TODOs:
// - invitation onboarding flow (send invite with one-time token)
// - password reset UX + admin-driven reset tokens
// - email verification enforcement for new accounts
// - employee / student import tooling with id mapping and validation
// - account recovery and orphaned-auth cleanup automation
