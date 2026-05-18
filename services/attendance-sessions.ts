import { db } from "@/firebase/config";
import type { AttendanceSession } from "@/types/attendance";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const ATTENDANCE_SESSIONS = "attendance_sessions";

export async function saveAttendanceSession(
  session: Omit<AttendanceSession, "createdAt" | "id">,
) {
  const ref = collection(db, ATTENDANCE_SESSIONS);
  const payload = {
    ...session,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(ref, payload as any);
  return docRef.id;
}
