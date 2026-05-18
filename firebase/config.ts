import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
    getAuth,
    getReactNativePersistence,
    initializeAuth,
    type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { Platform } from "react-native";

/** Trim values and strip accidental trailing commas from .env lines. */
function env(name: string): string {
  const raw = process.env[name];
  if (raw == null) return "";
  return raw.trim().replace(/,+$/, "");
}

const firebaseConfig = {
  apiKey: env("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: env("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: env("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: env("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("EXPO_PUBLIC_FIREBASE_APP_ID"),
};

function logFirebaseSetup(): void {
  if (!__DEV__) return;

  const mask = (value: string) =>
    value ? `${value.slice(0, 6)}…` : "(missing)";

  console.log("[Firebase] Initializing app…");
  console.log("[Firebase] Config:", {
    apiKey: mask(firebaseConfig.apiKey),
    authDomain: firebaseConfig.authDomain || "(missing)",
    projectId: firebaseConfig.projectId || "(missing)",
    storageBucket: firebaseConfig.storageBucket || "(missing)",
    messagingSenderId: firebaseConfig.messagingSenderId || "(missing)",
    appId: mask(firebaseConfig.appId),
  });

  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(
      "[Firebase] Missing EXPO_PUBLIC_* env vars:",
      missing.join(", "),
      "— restart with: npx expo start -c",
    );
  }
}

function initApp(): FirebaseApp {
  if (getApps().length > 0) {
    if (__DEV__) console.log("[Firebase] Reusing existing Firebase app");
    return getApp();
  }

  logFirebaseSetup();
  const app = initializeApp(firebaseConfig);
  if (__DEV__) console.log("[Firebase] App initialized");
  return app;
}

function initAuth(app: FirebaseApp): Auth {
  if (Platform.OS === "web") {
    if (__DEV__) console.log("[Firebase] Auth: getAuth (web)");
    return getAuth(app);
  }

  try {
    const instance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    if (__DEV__) {
      console.log(
        "[Firebase] Auth: initializeAuth with AsyncStorage persistence",
      );
    }
    return instance;
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";

    if (code === "auth/already-initialized") {
      if (__DEV__)
        console.log("[Firebase] Auth: already initialized, using getAuth");
      return getAuth(app);
    }

    console.error("[Firebase] Auth initialization failed:", error);
    throw error;
  }
}

const app = initApp();
export const auth = initAuth(app);
export const db: Firestore = getFirestore(app);
// Functions: allow overriding region via EXPO_PUBLIC_FUNCTIONS_REGION
const FUNCTIONS_REGION = env("EXPO_PUBLIC_FUNCTIONS_REGION") || "";
let _functions: Functions;
if (FUNCTIONS_REGION) {
  if (__DEV__)
    console.log("[Firebase] Functions region set to", FUNCTIONS_REGION);
  _functions = getFunctions(app, FUNCTIONS_REGION);
} else {
  if (__DEV__) console.log("[Firebase] Functions using default region");
  _functions = getFunctions(app);
}
export const functions = _functions;

// Temporary debug log to verify Expo env var loading for functions region
if (__DEV__) {
  try {
    // Also log the raw process.env value so we can confirm Expo loaded .env
    console.log(
      "[Firebase] Functions region (process.env):",
      process.env.EXPO_PUBLIC_FUNCTIONS_REGION,
    );
    console.log("[Firebase] functions instance:", Boolean(_functions));
  } catch (e) {
    // defensive
    console.warn("[Firebase] failed to log functions region", e);
  }
}
