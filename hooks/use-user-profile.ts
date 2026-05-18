import { doc, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { db } from "@/firebase/config";
import {
    getFirestoreErrorMessage,
    parseUserProfile,
} from "@/services/user-profile";
import type { UserProfile, UserProfileFirestore } from "@/types/user-profile";

const USERS_COLLECTION = "users";

type UseUserProfileResult = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

export function useUserProfile(): UseUserProfileResult {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const missingProfileTimerRef = useRef<number | null>(null);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const userRef = doc(db, USERS_COLLECTION, user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.debug(
            "[useUserProfile] snapshot missing for uid=",
            user.uid,
            "— waiting briefly for eventual write",
          );
          setProfile(null);
          // start a short timer before surfacing the error to account for
          // brief eventual-consistency / write propagation delays
          if (missingProfileTimerRef.current) {
            clearTimeout(missingProfileTimerRef.current as any);
            missingProfileTimerRef.current = null;
          }
          missingProfileTimerRef.current = setTimeout(() => {
            setError("Your student profile was not found.");
            setIsLoading(false);
            missingProfileTimerRef.current = null;
          }, 1500) as unknown as number;
          return;
        }

        // If we had a pending missing-profile timer, clear it because the
        // document now exists.
        if (missingProfileTimerRef.current) {
          clearTimeout(missingProfileTimerRef.current as any);
          missingProfileTimerRef.current = null;
        }

        try {
          const parsed = parseUserProfile(
            snapshot.data() as UserProfileFirestore,
          );
          setProfile(parsed);
          setError(null);
        } catch (parseError) {
          console.error("[useUserProfile] Parse error:", parseError);
          setProfile(null);
          setError(
            parseError instanceof Error
              ? parseError.message
              : "Invalid profile data in Firestore.",
          );
        }

        setIsLoading(false);
      },
      (snapshotError) => {
        console.error("[useUserProfile] Firestore error:", snapshotError);
        setProfile(null);
        setError(getFirestoreErrorMessage(snapshotError));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [authLoading, user?.uid, retryCount]);

  return {
    profile,
    isLoading: authLoading || isLoading,
    error,
    retry,
  };
}

export function formatYearLabel(year?: string): string {
  if (!year || typeof year !== "string") return "";
  return year.toLowerCase().startsWith("year") ? year : `Year ${year}`;
}

export function formatProfileSubtitle(
  department?: string,
  year?: string,
): string {
  const dept = department ?? "";
  const yearLabel = formatYearLabel(year);
  if (dept && yearLabel) return `${dept} · ${yearLabel}`;
  if (dept) return dept;
  if (yearLabel) return yearLabel;
  return "";
}
