import { doc, getDoc } from "firebase/firestore";

import { db } from "@/firebase/config";
import type {
    UserProfile,
    UserProfileFirestore,
    UserRole,
} from "@/types/user-profile";

const USERS_COLLECTION = "users";

function toNumber(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Invalid ${field} in user profile`);
}

function toString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new Error(`Invalid ${field} in user profile`);
}

export function parseUserProfile(data: UserProfileFirestore): UserProfile {
  // role is required and determines validation rules
  const roleRaw = data.role;
  const role =
    typeof roleRaw === "string"
      ? (roleRaw.trim().toLowerCase() as UserRole)
      : null;

  if (
    !role ||
    (role !== "student" &&
      role !== "faculty" &&
      role !== "admin" &&
      role !== "hod")
  ) {
    throw new Error("Invalid or missing role in user profile");
  }

  const name = toString(data.name, "name");

  if (role === "student") {
    // student: require department and year and numeric attendance/cgpa
    const department = toString(data.department, "department");
    const year = toString(data.year, "year");
    const attendance = toNumber(data.attendance ?? 0, "attendance");
    const cgpa = toNumber(data.cgpa ?? 0, "cgpa");

    return {
      name,
      role: "student",
      department,
      year,
      attendance,
      cgpa,
    };
  }

  if (role === "faculty") {
    // faculty: department optional, year not required
    const department =
      data.department === undefined
        ? undefined
        : String(data.department || "").trim() || undefined;
    const designation =
      data.designation === undefined
        ? undefined
        : String(data.designation || "").trim() || undefined;
    const assignedSubjects = Array.isArray(data.assignedSubjects)
      ? data.assignedSubjects.map(String)
      : undefined;
    // attendance/cgpa may be absent for faculty; provide safe defaults
    const attendance =
      data.attendance === undefined
        ? 0
        : toNumber(data.attendance, "attendance");
    const cgpa = data.cgpa === undefined ? 0 : toNumber(data.cgpa, "cgpa");

    return {
      name,
      role: "faculty",
      department,
      designation,
      assignedSubjects,
      attendance,
      cgpa,
    } as UserProfile;
  }

  if (role === "hod") {
    const departments = Array.isArray(data.departments)
      ? (data.departments as string[]).map(String)
      : data.department
        ? [String(data.department)]
        : [];

    return {
      name,
      role: "hod",
      departments,
    } as UserProfile;
  }

  // admin
  const department =
    data.department === undefined
      ? undefined
      : String(data.department || "").trim() || undefined;
  const permissions = Array.isArray(data.permissions)
    ? data.permissions.map(String)
    : undefined;
  const attendance =
    data.attendance === undefined ? 0 : toNumber(data.attendance, "attendance");
  const cgpa = data.cgpa === undefined ? 0 : toNumber(data.cgpa, "cgpa");

  return {
    name,
    role: "admin",
    department,
    permissions,
    attendance,
    cgpa,
  } as UserProfile;
}

export function getFirestoreErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case "permission-denied":
        return "You do not have permission to view this profile.";
      case "unavailable":
        return "Firestore is temporarily unavailable. Check your connection.";
      case "not-found":
        return "Your student profile was not found.";
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to load your profile. Please try again.";
}

export async function fetchUserProfile(uid: string): Promise<UserProfile> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));

  if (!snapshot.exists()) {
    throw new Error("Your student profile was not found.");
  }

  return parseUserProfile(snapshot.data() as UserProfileFirestore);
}
