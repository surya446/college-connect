import { useUserProfile } from "@/hooks/use-user-profile";
import {
    hasRole,
    isAdmin as utilIsAdmin,
    isFaculty as utilIsFaculty,
    isStudent as utilIsStudent,
} from "@/utils/roles";
import { useMemo } from "react";

export type UseRoleResult = {
  role: string | null;
  isLoading: boolean;
  isStudent: boolean;
  isFaculty: boolean;
  isAdmin: boolean;
  hasRole: (expected: string | string[]) => boolean;
};

export function useRole(): UseRoleResult {
  const { profile, isLoading } = useUserProfile();
  const role = profile?.role ?? null;

  const result = useMemo(() => {
    return {
      role,
      isLoading,
      isStudent: utilIsStudent(role),
      isFaculty: utilIsFaculty(role),
      isAdmin: utilIsAdmin(role),
      hasRole: (expected: string | string[]) => hasRole(role, expected),
    } as UseRoleResult;
  }, [role, isLoading]);

  return result;
}
