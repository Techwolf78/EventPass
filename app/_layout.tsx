import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCheckInNotifications } from "@/hooks/useCheckInNotifications";
import { ActivityIndicator, LogBox, View } from "react-native";

import AnimatedSplash from "@/components/AnimatedSplash";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";

// Suppress CSS interop navigation context warnings from LogBox
LogBox.ignoreLogs([
  "Couldn't find a navigation context",
  "react-native-css-interop",
]);

// Suppress known CSS interop navigation context warning from console
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  const errorStr = args?.toString?.() || "";
  const firstArg = args?.[0];

  if (
    (typeof firstArg === "string" &&
      firstArg.includes("Couldn't find a navigation context")) ||
    (typeof errorStr === "string" &&
      errorStr.includes("Couldn't find a navigation context"))
  ) {
    return; // Suppress this specific warning
  }
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  const warnStr = args?.toString?.() || "";
  const firstArg = args?.[0];

  if (
    (typeof firstArg === "string" &&
      firstArg.includes("Couldn't find a navigation context")) ||
    (typeof warnStr === "string" &&
      warnStr.includes("Couldn't find a navigation context"))
  ) {
    return; // Suppress this specific warning
  }
  originalWarn.call(console, ...args);
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const { loading, user, isAdmin } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);

  useCheckInNotifications();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need here
        // Brief delay to ensure native splash displays properly
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady && !loading) {
      // Hide the native splash screen — the animated splash takes over
      SplashScreen.hideAsync();
    }
  }, [appIsReady, loading]);

  useEffect(() => {
    // Only navigate after both splashes are done
    if (loading || !appIsReady || showAnimatedSplash) return;

    const inAuthGroup = segments[0] === "(auth)";
    const guestAllowedScreens = new Set([
      "qr-pass",
      "agenda",
      "attendees",
      "profile",
      "gallery",
    ]);
    const inGuestAllowed =
      segments[0] === "(attendee)" && guestAllowedScreens.has(segments[1]);

    if (!user && !inAuthGroup && !inGuestAllowed) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Redirect away from login if already authenticated
      if (isAdmin) {
        router.replace("/(admin)/panel");
      } else {
        router.replace("/(attendee)/agenda");
      }
    }
  }, [
    user,
    loading,
    segments,
    isAdmin,
    appIsReady,
    showAnimatedSplash,
    router,
  ]);

  if (!appIsReady || loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0f172a",
        }}
      >
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(admin)"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(attendee)"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" />

      {/* Animated splash overlay — renders on top of everything */}
      {showAnimatedSplash && (
        <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
