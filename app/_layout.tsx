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
import { useIsConnected } from "@/hooks/useIsConnected";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  LogBox,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

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
  const { width } = useWindowDimensions();
  const { loading, user, isAdmin, guestSession, isGuest } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);
  const isConnected = useIsConnected();
  const [showOfflinePass, setShowOfflinePass] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowOfflinePass(false);
    }
  }, [isConnected]);

  useCheckInNotifications();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const router = useRouter();
  const segments = useSegments();
  const isPublicPage = !!(segments[0] && [
    "privacy-policy",
    "terms-and-conditions",
    "delete-account",
    "about",
    "support",
    "marketing",
    "analytics",
  ].includes(segments[0]));

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
    if (appIsReady && (!loading || isPublicPage)) {
      // Hide the native splash screen — the animated splash takes over
      SplashScreen.hideAsync();
    }
  }, [appIsReady, loading]);

  useEffect(() => {
    // Only navigate after both splashes are done
    if (!isPublicPage && (loading || !appIsReady || showAnimatedSplash)) return;

    const inAuthGroup = segments[0] === "(auth)";
    const legalPages = new Set([
      "privacy-policy",
      "terms-and-conditions",
      "delete-account",
      "about",
      "support",
      "marketing",
      "analytics",
    ]);
    const isLegalPage = legalPages.has(segments[0]);

    const guestAllowedScreens = new Set([
      "qr-pass",
      "agenda",
      "attendees",
      "profile",
      "gallery",
    ]);
    const inGuestAllowed =
      segments[0] === "(attendee)" && guestAllowedScreens.has(segments[1]);

    const time = new Date().toLocaleTimeString();
    console.log(`\n[${time}] 🔍 ROUTING CHECK:`);
    console.log(`  Current route: ${segments.join("/")} or /`);
    console.log(
      `  user: ${user?.email || "null"}, isAdmin: ${isAdmin}, isGuest: ${isGuest}`,
    );
    console.log(
      `  inAuthGroup: ${inAuthGroup}, inGuestAllowed: ${inGuestAllowed}, isLegalPage: ${isLegalPage}`,
    );

    // Allow legal pages without auth check
    if (isLegalPage) {
      console.log(`  ✅ ALLOWED: Legal page (no auth required)`);
      return;
    }

    if (user && inAuthGroup) {
      // Firebase-authenticated user on login page → redirect to their dashboard
      console.log(`  ❌ REDIRECT: Authenticated user on login page`);
      if (isAdmin) {
        console.log(`  → Going to /(admin)/panel`);
        router.replace("/(admin)/panel");
      } else {
        console.log(`  → Going to /(attendee)/agenda`);
        router.replace("/(attendee)/agenda");
      }
    } else if (!user && isGuest && inAuthGroup) {
      // Guest with a saved session on login page → send them straight to QR pass
      console.log(`  ❌ REDIRECT: Guest on login page`);
      console.log(`  → Going to /(attendee)/qr-pass`);
      router.replace({
        pathname: "/(attendee)/qr-pass",
        params: { qrToken: guestSession!.qrToken },
      });
    } else if (!user && isGuest && !inGuestAllowed) {
      // Guest with a saved session but on a non-guest screen → redirect to QR pass
      console.log(`  ❌ REDIRECT: Guest on non-guest-allowed screen`);
      console.log(`  → Going to /(attendee)/qr-pass`);
      router.replace({
        pathname: "/(attendee)/qr-pass",
        params: { qrToken: guestSession!.qrToken },
      });
    } else if (!user && !isGuest && !inAuthGroup && !inGuestAllowed) {
      // No user, no guest session → redirect to login
      console.log(`  ❌ REDIRECT: No auth, no guest → sending to login`);
      console.log(`  → Going to /(auth)/login`);
      router.replace("/(auth)/login");
    } else {
      console.log(`  ✅ ALLOWED: Page is accessible`);
    }
  }, [
    user,
    loading,
    segments,
    isAdmin,
    isGuest,
    guestSession,
    appIsReady,
    showAnimatedSplash,
    router,
  ]);

  if (!appIsReady || (loading && !isPublicPage)) {
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
      <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
        <View
          style={
            width >= 768 &&
            segments[0] &&
            ![
              "marketing",
              "analytics",
              "privacy-policy",
              "terms-and-conditions",
              "about",
              "support",
              "delete-account",
            ].includes(segments[0])
              ? {
                  maxWidth: 600,
                  width: "100%",
                  alignSelf: "center",
                  flex: 1,
                  backgroundColor: colorScheme === "dark" ? "#0f172a" : "#ffffff",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                  overflow: "hidden",
                }
              : { flex: 1 }
          }
        >
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
        </View>
      </View>
      <StatusBar style="light" />

      {/* Premium Full-Screen Offline Overlay Page */}
      {!isConnected && !showOfflinePass && (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#0f172a", // Solid deep slate background matching dark theme
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 60,
            paddingHorizontal: 24,
            zIndex: 999999,
          }}
        >
          {/* Top Logo / Brand */}
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text
              style={{
                color: "#3b82f6",
                fontWeight: "900",
                fontSize: 14,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              ConnectHQ
            </Text>
          </View>

          {/* Center Content */}
          <View
            style={{
              alignItems: "center",
              width: "100%",
              paddingHorizontal: 16,
            }}
          >
            {/* Glowing Amber Icon Circle */}
            <View
              style={{
                width: 108,
                height: 108,
                borderRadius: 54,
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderWidth: 2,
                borderColor: "rgba(245, 158, 11, 0.3)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 32,
                shadowColor: "#f59e0b",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 15,
                elevation: 4,
              }}
            >
              <Ionicons name="cloud-offline" size={50} color="#f59e0b" />
            </View>

            <Text
              style={{
                color: "#ffffff",
                fontWeight: "800",
                fontSize: 26,
                textAlign: "center",
                marginBottom: 14,
              }}
            >
              Connection Lost
            </Text>

            <Text
              style={{
                color: "#94a3b8",
                fontSize: 16,
                lineHeight: 24,
                textAlign: "center",
                marginBottom: 36,
              }}
            >
              ConnectHQ needs an active internet connection to download and
              synchronize the latest schedule, events, and announcements.
            </Text>

            {/* Reconnecting Status Box */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(245, 158, 11, 0.05)",
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 30,
                borderWidth: 1,
                borderColor: "rgba(245, 158, 11, 0.2)",
              }}
            >
              <ActivityIndicator
                size="small"
                color="#f59e0b"
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  color: "#f59e0b",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Waiting for network connection...
              </Text>
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={{ width: "100%", paddingHorizontal: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowOfflinePass(true)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                paddingVertical: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.12)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                Access Offline Event Pass
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Minimized Floating Offline Banner (Allows using offline pass) */}
      {!isConnected && showOfflinePass && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowOfflinePass(false)}
          style={{
            position: "absolute",
            bottom: 90,
            left: 20,
            right: 20,
            backgroundColor: "#d97706",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 8,
            zIndex: 99999,
          }}
        >
          <Ionicons
            name="cloud-offline"
            size={20}
            color="#ffffff"
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>
              Offline Mode Active
            </Text>
            <Text style={{ color: "#fef3c7", fontSize: 12, marginTop: 2 }}>
              Tap here to return to connection status.
            </Text>
          </View>
          <Ionicons name="chevron-up" size={18} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Animated splash overlay — renders on top of everything */}
      {showAnimatedSplash && !isPublicPage && (
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
