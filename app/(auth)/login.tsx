import { auth, db } from "@/firebase/config";
import { router } from "expo-router";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#4F46E5";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/invalid-api-key":
    "Firebase API key is invalid. Check your .env file and restart Expo with -c.",
  "auth/configuration-not-found":
    "Firebase Auth is not configured. Enable Email/Password in Firebase Console.",
};

function getAuthErrorDetails(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof FirebaseError) {
    return {
      code: error.code,
      message: AUTH_ERROR_MESSAGES[error.code] ?? error.message,
    };
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: string }).code);
    const rawMessage =
      "message" in error
        ? String((error as { message: string }).message)
        : "Login failed.";
    return {
      code,
      message: AUTH_ERROR_MESSAGES[code] ?? rawMessage,
    };
  }

  return {
    code: "auth/unknown",
    message: "An unexpected error occurred. Please try again.",
  };
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert("Invalid login", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (__DEV__) {
        console.log("[Login] Attempting sign in for:", trimmedEmail);
      }
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      // Ensure Firestore profile exists for this auth uid
      const current = auth.currentUser;
      if (current?.uid) {
        try {
          const userRef = doc(db, "users", current.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            // Sign out to avoid app crashes and show actionable message
            await signOut(auth);
            Alert.alert(
              "Profile not found",
              "Your account was authenticated but no user profile was found. Please contact your administrator to complete onboarding or try again.",
            );
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("[Login] error checking user profile", e);
        }
      }
      if (__DEV__) console.log("[Login] Sign in successful");
      router.replace("/(tabs)");
    } catch (error: unknown) {
      const { code, message } = getAuthErrorDetails(error);
      console.error("[Login] Auth error:", { code, message, error });
      Alert.alert(`Login failed (${code})`, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>CollegeConnect</Text>
            <Text style={styles.subtitle}>Sign in to your campus account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@college.edu"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                editable={!loading}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (pressed || loading) && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "center",
  },
  header: {
    marginBottom: 40,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
