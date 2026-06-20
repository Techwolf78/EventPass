import { db } from "@/config/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { Platform } from "react-native";

export type PermissionStatus = "granted" | "denied" | "undetermined";

/**
 * Checks the current notification permission status.
 */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionStatus;
  } catch (error) {
    console.error("[NotificationHelper] Error checking permissions:", error);
    return "undetermined";
  }
}

/**
 * Requests notification permissions from the device.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return status === "granted";
  } catch (error) {
    console.error("[NotificationHelper] Error requesting permissions:", error);
    return false;
  }
}

/**
 * Retrieves the Expo Push Token and stores it in Firestore.
 * Associates the token with the guest/user in AsyncStorage and Firestore.
 */
export async function registerPushTokenForGuestOrUser(
  enrollmentType: string,
  qrToken?: string | null,
  email?: string | null,
): Promise<{ success: boolean; token: string | null; isMock: boolean }> {
  try {
    let token: string | null = null;
    let isMock = false;

    // 1. Get token (check if device is physical)
    if (!Device.isDevice) {
      console.warn(
        "[NotificationHelper] Emulator detected. Mocking Expo Push Token.",
      );
      token = `MOCK_EXPO_PUSH_TOKEN_${Platform.OS}_${Date.now()}`;
      isMock = true;
    } else {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.error(
          "[NotificationHelper] No EAS projectId found. Cannot register push token.",
        );
        return { success: false, token: null, isMock: false };
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
    }

    if (!token) {
      return { success: false, token: null, isMock };
    }

    console.log("[NotificationHelper] Token fetched:", token);

    // 2. Save token to Firestore 'pushTokens' collection
    await setDoc(
      doc(db, "pushTokens", token),
      {
        token,
        platform: Platform.OS,
        enrollmentType: enrollmentType.toLowerCase(),
        qrToken: qrToken || null,
        email: email || null,
        experienceId: "@connecthq/connect-hq",
        isMock,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

    // 3. Save token in candidate document in Firestore
    if (qrToken) {
      const candidateQuery = query(
        collection(db, "candidates"),
        where("qrToken", "==", qrToken),
      );
      const candidateSnap = await getDocs(candidateQuery);
      if (!candidateSnap.empty) {
        const candidateDocRef = candidateSnap.docs[0].ref;
        await setDoc(
          candidateDocRef,
          { pushToken: token, updatedAt: Timestamp.now() },
          { merge: true },
        );
        console.log("[NotificationHelper] Linked token with candidate document.");
      }

      // 4. Save token in guestList document in Firestore
      const guestQuery = query(
        collection(db, "guestList"),
        where("qrToken", "==", qrToken),
      );
      const guestSnap = await getDocs(guestQuery);
      if (!guestSnap.empty) {
        const guestDocRef = guestSnap.docs[0].ref;
        await setDoc(
          guestDocRef,
          { pushToken: token, updatedAt: Timestamp.now() },
          { merge: true },
        );
        console.log("[NotificationHelper] Linked token with guestList document.");
      }
    }

    // 5. Save locally to AsyncStorage
    await AsyncStorage.setItem("pushToken", token);
    await AsyncStorage.setItem("notificationsEnabled", "true");

    return { success: true, token, isMock };
  } catch (error) {
    console.error("[NotificationHelper] Error registering push token:", error);
    return { success: false, token: null, isMock: false };
  }
}
