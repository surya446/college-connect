import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

type Role = "student" | "faculty" | "hod" | "admin" | "system";

type CreateUserPayload = {
  email: string;
  password: string;
  role: Role;
  displayName?: string | null;
  mobile?: string | null;
  // Student-specific
  departmentId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  rollNumber?: string | null;
  year?: string | null;
  // Faculty-specific
  employeeId?: string | null;
  designation?: string | null;
  // Generic profile object passthrough
  profile?: Record<string, unknown> | null;
};

const ALLOWED_ROLES: Role[] = ["student", "faculty", "hod", "admin", "system"];

/**
 * adminCreateUser callable Cloud Function
 * - Region: asia-south1
 * - Validates caller has admin privileges (via custom claims)
 * - Validates input payload
 * - Creates Firebase Auth user
 * - Writes Firestore users/{uid} profile
 * - Writes an audit_logs entry
 * - Rolls back created Auth user if Firestore write fails
 */
export const adminCreateUser = functions
  .region("asia-south1")
  .https.onCall(async (data: CreateUserPayload, context: any) => {
    console.log("[adminCreateUser] invoked", { data, auth: context.auth?.uid });

    // 1) Validate caller
    if (!context.auth || !context.auth.uid) {
      console.warn("[adminCreateUser] unauthenticated caller");
      throw new functions.https.HttpsError(
        "permission-denied",
        "Authentication required",
      );
    }

    // Fetch caller profile from Firestore and validate role/isActive
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(context.auth.uid)
      .get();

    console.log("[adminCreateUser] callerDoc.exists:", callerDoc.exists);

    if (!callerDoc.exists) {
      console.error("[adminCreateUser] Caller profile not found in Firestore", {
        callerUid: context.auth.uid,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller profile not found",
      );
    }

    const callerProfile = callerDoc.data();
    console.log("[adminCreateUser] caller profile raw:", callerProfile);

    const callerRole = (
      callerProfile?.role as string | undefined
    )?.toLowerCase?.();
    console.log("[adminCreateUser] caller role:", callerRole);

    const isActive = Boolean(callerProfile?.isActive);
    console.log("[adminCreateUser] caller isActive:", isActive);

    const status = (callerProfile as any)?.status;
    console.log("[adminCreateUser] caller status:", status);

    if (!isActive) {
      console.warn("[adminCreateUser] caller profile is not active", {
        callerUid: context.auth.uid,
        isActive,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Caller account is not active",
      );
    }

    if (callerRole !== "admin" && callerRole !== "hod") {
      console.warn("[adminCreateUser] caller lacks admin/hod rights", {
        callerUid: context.auth.uid,
        callerRole,
      });
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins/HODs may create accounts",
      );
    }

    // 2) Validate input
    if (!data || typeof data !== "object") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing payload",
      );
    }

    // Allow callers to pass some fields inside `data.profile` (legacy/frontends)
    const profilePayload = (data.profile ?? {}) as Record<string, any>;

    const email = typeof data.email === "string" ? data.email.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    const role =
      typeof data.role === "string" ? (data.role as Role) : (undefined as any);

    // Map possible profile keys into top-level expected fields to support various frontends
    const derivedDisplayName =
      data.displayName ?? profilePayload.displayName ?? null;
    const derivedMobile = data.mobile ?? profilePayload.mobile ?? null;
    const derivedEmployeeId =
      data.employeeId ??
      profilePayload.employeeId ??
      profilePayload.facultyId ??
      null;
    const derivedDepartmentId =
      data.departmentId ??
      profilePayload.departmentId ??
      profilePayload.department ??
      null;

    console.log("[adminCreateUser] derived fields:", {
      derivedDisplayName,
      derivedMobile,
      derivedEmployeeId,
      derivedDepartmentId,
    });

    // Defensive normalization of displayName: never pass null to Auth
    const safeDisplayName =
      typeof derivedDisplayName === "string" &&
      derivedDisplayName.trim().length > 0
        ? derivedDisplayName.trim()
        : undefined;
    console.log("[adminCreateUser] safeDisplayName:", safeDisplayName);

    try {
      if (!email)
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email is required",
        );
      if (!password || password.length < 6)
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Password must be at least 6 characters",
        );
      if (!role || !ALLOWED_ROLES.includes(role))
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid role",
        );

      // role-specific validations
      if (role === "student") {
        if (!data.rollNumber)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "student.rollNumber required",
          );
        if (!data.classId)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "student.classId required",
          );
        if (!data.sectionId)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "student.sectionId required",
          );
      }

      if (role === "faculty") {
        if (!derivedEmployeeId)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "faculty.employeeId required",
          );
        if (!derivedDepartmentId)
          throw new functions.https.HttpsError(
            "invalid-argument",
            "faculty.departmentId required",
          );
      }
    } catch (validationErr: any) {
      console.error("[adminCreateUser] validation error:", validationErr);
      throw validationErr;
    }

    // 3) Create Firebase Auth user
    let createdUid: string | null = null;
    try {
      console.log("[adminCreateUser] creating firebase auth user", { email });
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: safeDisplayName,
        phoneNumber: derivedMobile ?? undefined,
      });
      createdUid = userRecord.uid;
      console.log("[adminCreateUser] auth user created uid=", createdUid);

      // set custom claims for role
      try {
        await admin.auth().setCustomUserClaims(createdUid, { role });
        console.log("[adminCreateUser] custom claims set", {
          uid: createdUid,
          role,
        });
      } catch (claimErr) {
        console.warn("[adminCreateUser] failed to set custom claims", claimErr);
      }

      // 4) Create Firestore users/{uid} document
      const now = admin.firestore.FieldValue.serverTimestamp();
      const usersRef = db.collection("users").doc(createdUid);

      const baseProfile: Record<string, unknown> = {
        uid: createdUid,
        // store both `name` and `displayName` consistently
        name: safeDisplayName ?? null,
        displayName: safeDisplayName ?? null,
        role,
        email,
        mobile: derivedMobile ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      let profileDoc: Record<string, unknown> = { ...baseProfile };

      if (role === "faculty") {
        profileDoc = {
          ...profileDoc,
          departmentId: derivedDepartmentId ?? null,
          employeeId: derivedEmployeeId ?? null,
          designation: data.designation ?? null,
        };
      } else if (role === "student") {
        profileDoc = {
          ...profileDoc,
          departmentId: data.departmentId ?? null,
          classId: data.classId ?? null,
          sectionId: data.sectionId ?? null,
          rollNumber: data.rollNumber ?? null,
          year: data.year ?? null,
        };
      } else if (role === "hod" || role === "admin" || role === "system") {
        profileDoc = {
          ...profileDoc,
          // allow callers to include profile extras under data.profile
          ...(profilePayload ?? {}),
        };
      }

      console.log("[adminCreateUser] writing firestore profile", {
        uid: createdUid,
        profile: profileDoc,
      });
      await usersRef.set(profileDoc, { merge: true });
      console.log(
        "[adminCreateUser] firestore profile created uid=",
        createdUid,
      );

      // 5) Write audit log entry
      try {
        await db.collection("audit_logs").add({
          actorUid: context.auth?.uid ?? "system",
          actionType: "user_account",
          targetCollection: "users",
          targetDocumentId: createdUid,
          newState: { role, email, ...profileDoc },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          systemGenerated: true,
        });
        console.log("[adminCreateUser] audit log written for uid=", createdUid);
      } catch (auditErr) {
        console.warn("[adminCreateUser] audit log write failed", auditErr);
      }

      // 6) Return created uid
      return { uid: createdUid };
    } catch (err: any) {
      console.error("[adminCreateUser] error during creation", err);

      // Rollback: if auth user was created but Firestore write failed, delete auth user
      if (createdUid) {
        try {
          console.warn(
            "[adminCreateUser] rollback: deleting auth user",
            createdUid,
          );
          await admin.auth().deleteUser(createdUid);
          console.warn(
            "[adminCreateUser] rollback: auth user deleted",
            createdUid,
          );
        } catch (delErr) {
          console.error(
            "[adminCreateUser] rollback failed to delete auth user",
            createdUid,
            delErr,
          );
        }
      }

      // Map common errors to typed HttpsError
      if (err && err.code) {
        // auth/already-exists -> already-exists
        if (
          typeof err.code === "string" &&
          err.code.includes("auth/email-already-exists")
        ) {
          throw new functions.https.HttpsError(
            "already-exists",
            "Email already in use",
          );
        }
      }

      throw new functions.https.HttpsError("internal", "User creation failed", {
        message: err?.message,
      });
    }
  });

// TODOs:
// - invitation onboarding flow (send invite with one-time token)
// - email verification enforcement + onboarding emails
// - temporary password generation & secure delivery
// - bulk CSV import with validation & mapping
// - role escalation / approval flows
// - retention / orphaned-auth cleanup automation

// Deployment:
// 1) Ensure functions SDK and admin SDK are installed in your functions project:
//    npm install firebase-functions firebase-admin
// 2) Deploy:
//    firebase deploy --only functions

// Notes:
// - Ensure this file is placed in your Cloud Functions TypeScript project under `functions/src/index.ts`.
// - The callable name must exactly match `adminCreateUser` used by frontends.
// - Region used here is `asia-south1`; if you change it, update frontend `getFunctions(app, "<region>")` or set EXPO_PUBLIC_FUNCTIONS_REGION.
