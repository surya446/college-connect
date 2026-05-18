import { getDocs, onSnapshot, Query, Unsubscribe } from "firebase/firestore";
console.debug("[import] services/firestore-safe.ts");

/**
 * Safe wrapper for getDocs that returns an empty snapshot on permission errors
 * and logs the error. Preserves realtime-friendly usage.
 */
export async function safeGetDocs(q: Query) {
  try {
    const snap = await getDocs(q as any);
    return snap;
  } catch (err: any) {
    if (err && err.code === "permission-denied") {
      console.warn("[firestore-safe] permission denied for query", err);
      // Return an empty-like object to keep callers safe; callers using
      // snapshotToList should handle empty snapshots gracefully.
      return { docs: [] } as any;
    }
    console.error("[firestore-safe] getDocs failed", err);
    throw err;
  }
}

export function safeOnSnapshot(
  q: Query,
  onNext: (snap: any) => void,
  onError?: (e: any) => void,
): Unsubscribe {
  try {
    const unsub = onSnapshot(q as any, onNext, (e) => {
      if (e && e.code === "permission-denied") {
        console.warn(
          "[firestore-safe] permission denied for realtime subscription",
          e,
        );
        onNext({ docs: [] } as any);
        if (onError) onError(e);
        return;
      }
      if (onError) onError(e);
      else console.error("[firestore-safe] onSnapshot error", e);
    });
    return unsub;
  } catch (err: any) {
    console.error("[firestore-safe] failed to attach onSnapshot", err);
    // Return no-op unsubscribe
    return () => {};
  }
}

// TODO: Add batching, exponential retry, and instrumentation hooks
