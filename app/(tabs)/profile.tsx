import { DASHBOARD_COLORS as DASHBOARD_COLORS_RAW } from "@/constants/dashboard";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/firebase/config";
import {
    formatProfileSubtitle,
    useUserProfile,
} from "@/hooks/use-user-profile";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Safe fallback colors in case the constants file changes or is missing fields
const DASHBOARD_COLORS = {
  danger:
    (DASHBOARD_COLORS_RAW && (DASHBOARD_COLORS_RAW as any).danger) || "#DC2626",
  dangerLight:
    (DASHBOARD_COLORS_RAW && (DASHBOARD_COLORS_RAW as any).dangerLight) ||
    "#FEF2F2",
  text:
    (DASHBOARD_COLORS_RAW && (DASHBOARD_COLORS_RAW as any).text) || "#111827",
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, isLoading, error } = useUserProfile();

  async function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/login");
          } catch (err) {
            console.error("Sign out failed", err);
            Alert.alert("Sign out failed", "Could not sign out. Try again.");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {profile?.name ?? user?.email ?? "Profile"}
        </Text>
        <Text style={styles.subtitle}>
          {profile
            ? formatProfileSubtitle(profile.department, profile.year) +
              (profile.role ? ` · ${profile.role}` : "")
            : "Your profile information"}
        </Text>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: DASHBOARD_COLORS.dangerLight,
  },
  logoutText: {
    color: DASHBOARD_COLORS.danger,
    fontWeight: "700",
  },
});
