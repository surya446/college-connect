const UPLOAD_ROLES = new Set(["faculty", "admin", "administrator"]);

export function canUploadNotes(role: string | undefined | null): boolean {
  // During development we allow any authenticated user to upload notes so
  // testers can verify upload and display flows without requiring specific
  // roles. In production this should be restricted to faculty/admin only.
  // TODO: Remove this development override and re-enable role checks.
  if (__DEV__) {
    return true;
  }

  if (!role) return false;
  return UPLOAD_ROLES.has(role.trim().toLowerCase());
}

export function hasRole(
  role: string | undefined | null,
  expected: string | string[],
): boolean {
  if (!role) return false;
  const value = role.trim().toLowerCase();
  if (Array.isArray(expected))
    return expected.map((s) => s.toLowerCase()).includes(value);
  return value === expected.toLowerCase();
}

export function isStudent(role: string | undefined | null): boolean {
  return hasRole(role, "student");
}

export function isFaculty(role: string | undefined | null): boolean {
  return hasRole(role, "faculty");
}

export function isAdmin(role: string | undefined | null): boolean {
  return hasRole(role, "admin") || hasRole(role, "administrator");
}

// NOTE: This file contains only client-side checks for rendering convenience.
// Backend security must enforce role-based access via Firestore rules and
// Supabase policies. TODO: add security rule examples before production.
