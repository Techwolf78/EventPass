import { db } from "@/config/firebase";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
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
import { useRouter } from "expo-router";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";

// ─── Background Task Name ─────────────────────────────────────────────────────
// This MUST be defined at the top level (outside any component/function)
// so that expo-task-manager can find it when the app is killed/background.
export const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

// ─── Register Background Notification Task ───────────────────────────────────
// This runs when the OS delivers a push notification while the app is:
//   • Completely killed (force-stopped)
//   • In the background
//   • Device is locked
// IMPORTANT: Must be defined at module level (outside any React component).
TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({
    data,
    error,
    executionInfo,
  }: {
    data: any;
    error: any;
    executionInfo: any;
  }) => {
    if (error) {
      console.error("[BGNotification] Task error:", error);
      return;
    }
    // The notification was already delivered by FCM/APNs at OS level.
    // We just log here; the OS shows it automatically.
    console.log(
      "[BGNotification] ✅ Background notification received:",
      JSON.stringify(data),
    );
  },
);

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
    console.log("[Notifications] Android notification channel created.");
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
          allowProvisional: false,
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
//
// ⚠️  IMPORTANT: Expo Push Tokens only work on PHYSICAL DEVICES with a
//    development build (not Expo Go or simulator). If you're testing on a
//    simulator, this will fail — use a real device.
async function registerPushToken(enrollmentType: string): Promise<string | null> {
  try {
    // Simulators/emulators cannot receive push notifications
    // Use expo-device instead of deprecated Constants.isDevice
    if (!Device.isDevice) {
      console.warn(
        `[Notifications] Skipping push token — ${Platform.OS} emulators/simulators cannot receive push notifications. Use a real device.`,
      );
      return null;
    }

    // The projectId is required for Expo Push Tokens
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error(
        "[Notifications] No EAS projectId found in app.json — cannot register push token.",
      );
      return null;
    }

    console.log(
      `[Notifications] Registering push token for ${Platform.OS} device...`,
      `projectId: ${projectId}`,
    );

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log("[Notifications] Expo Push Token:", token);

    // Store in Firestore — the Cloud Function reads these to send pushes.
    // Using the token as the document ID prevents duplicates.
    // experienceId MUST be stored so the Cloud Function can group tokens
    // by Expo project before sending (avoids PUSH_TOO_MANY_EXPERIENCE_IDS).
    await setDoc(
      doc(db, "pushTokens", token),
      {
        token,
        platform: Platform.OS,
        enrollmentType,
        experienceId: "@connecthq/connect-hq",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }, // merge: true prevents overwriting existing tokens
    );

    console.log("[Notifications] Push token registered in Firestore.");
    return token;
  } catch (error: any) {
    // Provide a helpful message for the most common error
    if (error?.message?.includes("Must be a physical")) {
      console.warn(
        "[Notifications] Expo push tokens require a physical device. Background notifications won't work on emulators.",
      );
    } else {
      console.error("[Notifications] Error registering push token:", error);
    }
    return null;
  }
}

// ─── Register Background Notification Handler with Expo ─────────────────────
// Tells expo-notifications to use our TaskManager task for background delivery.
async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_NOTIFICATION_TASK,
    );

    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log(
        "[Notifications] Background notification task registered with Expo.",
      );
    } else {
      console.log(
        "[Notifications] Background notification task already registered.",
      );
    }
  } catch (error) {
    console.error("[Notifications] Error registering background task:", error);
  }
}

// ─── Local notification (foreground fallback) ────────────────────────────────
// When the app is open, the Firestore listener triggers this instantly.
async function showLocalCheckInNotification(guestName: string, enrollmentType: string): Promise<void> {
  try {
    const eventDisplayName = enrollmentType === "masterclass" ? "Masterclass 3.0" : "Synergy Sphere 2.0";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Guest Checked In",
        body: `${guestName} has arrived at ${eventDisplayName}.`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { search: guestName },
        ...(Platform.OS === "android" && { channelId: "checkins" }),
      },
      trigger: null, // null = deliver immediately
    });
  } catch (error) {
    console.error("[Notifications] Failed to show local notification:", error);
  }
}

// ─── Local milestone notification ───────────────────────────────────────────
async function showLocalMilestoneNotification(count: number, eventDisplayName: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${count} guests have checked in for ${eventDisplayName}!`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === "android" && { channelId: "checkins" }),
      },
      trigger: null,
    });
  } catch (error) {
    console.error("[Notifications] Failed to show milestone notification:", error);
  }
}

// ─── Main Hook ───────────────────────────────────────────────────────────────
export function useCheckInNotifications() {
  const isSetup = useRef(false);
  const router = useRouter();
  const { enrollmentType, loading: themeLoading } = useAttendeeTheme();

  useEffect(() => {
    // Listen for notification responses (clicks)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("[Notifications] User tapped notification:", response);
        try {
          const searchVal = response.notification.request.content.data?.search;
          if (searchVal) {
            router.push(`/(attendee)/attendees?search=${encodeURIComponent(String(searchVal))}`);
          } else {
            router.push("/(attendee)/attendees");
          }
        } catch (e) {
          console.error("[Notifications] Navigation from notification failed:", e);
        }
      }
    );

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (themeLoading) return;
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

        // 3. Register background notification task
        await registerBackgroundNotificationTask();

        // 4. Register push token for background/lock screen delivery
        await registerPushToken(enrollmentType);

        // 5. Keep Firestore listener running for real-time data awareness.
        // ⚠️ NOTE: We do NOT trigger local notifications from here anymore.
        // The Cloud Function (sendCheckInNotification) now handles ALL push
        // notification delivery via FCM — including when the app is in the
        // foreground (setNotificationHandler shows them as heads-up alerts).
        // Triggering local notifications here too would cause DUPLICATES.
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
                const candidateEnrollmentType = data.candidateEnrollmentType;

                if (scannedAt && scannedAt.toMillis() > mountedAt.toMillis()) {
                  if (candidateEnrollmentType === enrollmentType) {
                    // Real-time data received — Cloud Function push handles the notification.
                    console.log(
                      `[Notifications] New check-in detected for ${enrollmentType}: ${data.candidateName || "A guest"}. Push handled by Cloud Function.`,
                    );
                  }
                }
              }
            });
          },
          (error) => {
            console.error("[Notifications] Firestore listener error:", error);
          },
        );

        console.log(
          `[Notifications] ✅ Push token registered + Background task active + Firestore listener running for ${enrollmentType}.`,
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
  }, [themeLoading, enrollmentType, router]);
}
