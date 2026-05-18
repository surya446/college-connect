import { auth, db } from "@/firebase/config";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
console.debug("[import] context/auth-context.tsx");

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    console.debug("[auth-context] attaching onAuthStateChanged listener");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.debug(
        "[auth-context] onAuthStateChanged prev=",
        prevUidRef.current,
        "new=",
        firebaseUser?.uid,
      );
      // Update user immediately for consumers
      setUser(firebaseUser);

      // Defensive check: ensure Firestore profile exists for this uid.
      // Delay the check briefly to avoid racing with server-side account
      // creations that write profiles shortly after auth creation.
      (async () => {
        try {
          if (!firebaseUser?.uid) return;
          const uid = firebaseUser.uid;
          // small grace period to allow server side profile writes to complete
          await new Promise((r) => setTimeout(r, 700));
          const ref = doc(db, "users", uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            console.warn(
              "[auth-context] missing Firestore profile for uid=",
              uid,
            );
          } else {
            console.debug(
              "[auth-context] Firestore profile found for uid=",
              uid,
            );
          }
        } catch (e) {
          console.error(
            "[auth-context] error while checking Firestore profile",
            e,
          );
        } finally {
          setIsLoading(false);
        }
      })();
      prevUidRef.current = firebaseUser?.uid ?? null;
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, isLoading }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
