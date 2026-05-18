import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { db } from "@/firebase/config";
import {
    computeAttendanceSummary,
    getAttendanceErrorMessage,
    parseAttendanceRecord,
} from "@/services/attendance";
import type {
    AttendanceFirestore,
    AttendanceRecord,
    AttendanceSummary,
} from "@/types/attendance";

const ATTENDANCE_COLLECTION = "attendance";

type UseAttendanceRecordsResult = {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

export function useAttendanceRecords(): UseAttendanceRecordsResult {
  const { user, isLoading: authLoading } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      setRecords([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const attendanceQuery = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("studentId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const parsed: AttendanceRecord[] = [];
        const parseErrors: string[] = [];

        snapshot.forEach((docSnap) => {
          try {
            parsed.push(
              parseAttendanceRecord(
                docSnap.id,
                docSnap.data() as AttendanceFirestore,
              ),
            );
          } catch (parseError) {
            console.error(
              "[useAttendanceRecords] Parse error:",
              docSnap.id,
              parseError,
            );
            parseErrors.push(docSnap.id);
          }
        });

        parsed.sort((a, b) => a.subject.localeCompare(b.subject));
        setRecords(parsed);

        if (parseErrors.length > 0 && parsed.length === 0) {
          setError("Attendance records contain invalid data.");
        } else {
          setError(null);
        }

        setIsLoading(false);
      },
      (snapshotError) => {
        console.error("[useAttendanceRecords] Firestore error:", snapshotError);
        setRecords([]);
        setError(getAttendanceErrorMessage(snapshotError));
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [authLoading, user?.uid, retryCount]);

  const summary = useMemo(() => computeAttendanceSummary(records), [records]);

  return {
    records,
    summary,
    isLoading: authLoading || isLoading,
    error,
    retry,
  };
}
