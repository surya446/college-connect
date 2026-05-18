import { useRole } from "@/hooks/use-role";
import React from "react";

type ProtectedProps = {
  roles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode | null;
};

export function Protected({
  roles,
  children,
  fallback = null,
}: ProtectedProps) {
  const { isLoading, hasRole } = useRole();

  if (isLoading) return null; // keep existing loading visuals handled by parent

  if (hasRole(roles)) return <>{children}</>;

  return <>{fallback}</>;
}
