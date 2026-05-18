import { AuthProvider, useAuth } from "@/context/auth-context";
import { auth } from "@/firebase/config";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import {
    Stack,
    useRootNavigationState,
    useRouter,
    useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

const PRIMARY = "#4F46E5";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const colorScheme = useColorScheme();

  // splash control
  const splashHandledRef = useRef(false);
  const fallbackTimerRef = useRef<any>(null);

  useEffect(() => {
    async function preventAndWait() {
      try {
        console.debug("[startup] calling SplashScreen.preventAutoHideAsync");
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn("[startup] preventAutoHideAsync failed", e);
      }

      // log firebase presence
      try {
        console.debug("[startup] Firebase auth available:", Boolean(auth));
      } catch (e) {
        console.warn("[startup] failed to read firebase auth", e);
      }

      // start fallback: if init doesn't complete within 5s, force hide
      fallbackTimerRef.current = setTimeout(async () => {
        if (splashHandledRef.current) return;
        console.warn(
          "[startup] initialization timeout (>5000ms). Forcing splash hide.",
        );
        try {
          await SplashScreen.hideAsync();
          splashHandledRef.current = true;
          console.debug("[startup] splash hidden by timeout fallback");
        } catch (e) {
          console.error("[startup] hideAsync fallback failed", e);
        }
      }, 5000) as any;
    }

    preventAndWait();

    return () => {
      if (fallbackTimerRef.current)
        clearTimeout(fallbackTimerRef.current as any);
      fallbackTimerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onSplash = segments[0] === "splash";

    if (!user) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (inAuthGroup || onSplash) {
      // If we're on an auth route or the splash route, send to tabs
      router.replace("/(tabs)");
    }

    // hide splash when navigation ready and auth not loading
    (async () => {
      if (splashHandledRef.current) {
        console.debug("[startup] splash already handled, skipping hide");
        return;
      }
      try {
        console.debug("[startup] current user:", user?.uid ?? "(none)");
        console.debug(
          "[startup] Navigation state ready, attempting to hide splash",
        );
        await SplashScreen.hideAsync();
        splashHandledRef.current = true;
        // clear fallback timer if set
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current as any);
          fallbackTimerRef.current = null;
          console.debug(
            "[startup] cleared fallback timer after successful hide",
          );
        }
        console.debug("[startup] Splash hidden successfully");
      } catch (e) {
        console.error("[startup] SplashScreen.hideAsync failed", e);
      }
    })();
  }, [user, isLoading, segments, router, navigationState?.key]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
