import { db } from "@/config/firebase";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// ─── Foreground notification handler ─────────────────────────────────────────
// When the app is in the foreground, Expo suppresses notifications by default.
// This ensures they ALWAYS show as a heads-up alert + sound + badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// ─── Android Notification Channel ────────────────────────────────────────────
// Required on Android 8+ for notifications to appear. MAX importance ensures
// heads-up display, sound, vibration, and lock-screen visibility.
async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("checkins", {
      name: "Guest Arrivals",
      description: "Notifications when guests check in at the event",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4f46e5",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

// ─── Permission Request ──────────────────────────────────────────────────────
async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn(
        "[Notifications] Permission not granted — push notifications will not work.",
      );
      return false;
    }

    console.log("[Notifications] Permission granted.");
    return true;
  } catch (error) {
    console.error("[Notifications] Error requesting permissions:", error);
    return false;
  }
}

// ─── Push Token Registration ─────────────────────────────────────────────────
// Gets the Expo Push Token and stores it in Firestore so the Cloud Function
// can send real push notifications to this device. This is what makes
// background / lock screen / killed-app notifications work.
async function registerPushToken(): Promise<string | null> {
  try {
    // The projectId is required for Expo Push Tokens
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error(
        "[Notifications] No EAS projectId found in app.json — cannot register push token.",
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log("[Notifications] Expo Push Token:", token);

    // Store in Firestore — the Cloud Function reads these to send pushes.
    // Using the token as the document ID prevents duplicates.
    await setDoc(doc(db, "pushTokens", token), {
      token,
      platform: Platform.OS,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log("[Notifications] Push token registered in Firestore.");
    return token;
  } catch (error) {
    console.error("[Notifications] Error registering push token:", error);
    return null;
  }
}

// ─── Local notification (foreground fallback) ────────────────────────────────
// When the app is open, the Firestore listener triggers this instantly.
// The Cloud Function push will also arrive, but Expo deduplicates for us.
async function showLocalCheckInNotification(guestName: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Guest Arrived! 🎉",
        body: `${guestName} has arrived at the event.`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === "android" && { channelId: "checkins" }),
      },
      trigger: null, // null = deliver immediately
    });
  } catch (error) {
    console.error("[Notifications] Failed to show local notification:", error);
  }
}

// ─── Main Hook ───────────────────────────────────────────────────────────────
/**
 * Production-level check-in notification system using Expo Notifications.
 *
 * HOW IT WORKS:
 *
 * 1. **Background / Lock Screen / App Killed:**
 *    - Registers an Expo Push Token and stores it in Firestore.
 *    - A Firebase Cloud Function (sendCheckInNotification) triggers on
 *      every new attendance doc → reads all tokens from `pushTokens`
 *      collection → sends real push notifications via Expo Push API.
 *    - These are delivered by FCM (Android) / APNs (iOS) even when
 *      the app is completely killed or the device is locked.
 *
 * 2. **Foreground (app is open):**
 *    - A Firestore real-time listener detects new check-ins instantly
 *      and shows a local notification immediately (no server round-trip).
 *    - The setNotificationHandler above ensures it appears as a
 *      heads-up alert even while using the app.
 *
 * NOTES:
 * - Works for ALL users regardless of role (admin, attendee, guest).
 * - Every device that has the app installed gets the notification.
 * - No FCM topic subscription needed — fully Expo-native approach.
 */
export function useCheckInNotifications() {
  const isSetup = useRef(false);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const setup = async () => {
      // Prevent double-setup in StrictMode / fast-refresh
      if (isSetup.current) return;
      isSetup.current = true;

      try {
        // 1. Create the notification channel (Android)
        await setupNotificationChannel();

        // 2. Request permissions
        const granted = await requestNotificationPermissions();
        if (!granted) {
          console.warn(
            "[Notifications] Skipping setup — no notification permission.",
          );
          return;
        }

        // 3. Register push token for background/lock screen delivery
        await registerPushToken();

        // 4. Set up Firestore listener for instant foreground notifications
        const mountedAt = Timestamp.now();
        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, orderBy("scannedAt", "desc"), limit(1));

        unsubscribeFirestore = onSnapshot(
          q,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const data = change.doc.data();
                const scannedAt = data.scannedAt;

                // Only notify for check-ins AFTER mount (prevents historical flood)
                if (scannedAt && scannedAt.toMillis() > mountedAt.toMillis()) {
                  const name = data.candidateName || "A guest";
                  showLocalCheckInNotification(name);
                }
              }
            });
          },
          (error) => {
            console.error("[Notifications] Firestore listener error:", error);
          },
        );

        console.log(
          "[Notifications] ✅ Push token registered + Firestore listener active.",
        );
      } catch (error) {
        console.error("[Notifications] Error during setup:", error);
      }
    };

    setup();

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      isSetup.current = false;
    };
  }, []);
}
