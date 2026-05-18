import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    DashboardError,
    DashboardLoading,
} from "@/components/dashboard/dashboard-state";
import { NoteUploadForm } from "@/components/notes/note-upload-form";
import { DASHBOARD_COLORS } from "@/constants/dashboard";
import { useAuth } from "@/context/auth-context";
import { useRole } from "@/hooks/use-role";
import { useUserProfile } from "@/hooks/use-user-profile";

const PRIMARY = "#4F46E5";

export default function UploadNoteScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, error, retry } = useUserProfile();

  const isLoading = authLoading || profileLoading;
  const { isFaculty, isAdmin } = useRole();
  const canUpload = isFaculty || isAdmin;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={() => router.back()} />
        <DashboardLoading message="Loading…" />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={() => router.back()} />
        <DashboardError
          message={error ?? "Could not load your profile."}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (!user?.uid) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.deniedText}>Sign in to upload notes.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canUpload) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScreenHeader onBack={() => router.back()} />
        <View style={styles.centered}>
          <View style={styles.deniedCard}>
            <Text style={styles.deniedTitle}>Upload not permitted</Text>
            <Text style={styles.deniedMessage}>
              Only faculty and administrators can upload PDF notes.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Text style={styles.title}>Upload PDF</Text>
            <Text style={styles.subtitle}>
              Add study material to Supabase Storage and save details in
              Firestore.
            </Text>
          </View>
          <NoteUploadForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ScreenHeaderProps = {
  onBack: () => void;
};

function ScreenHeader({ onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={DASHBOARD_COLORS.text} />
      </Pressable>
    </View>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DASHBOARD_COLORS.primaryLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  intro: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  deniedText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  deniedCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  deniedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 8,
    textAlign: "center",
  },
  deniedMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    textAlign: "center",
  },
});
