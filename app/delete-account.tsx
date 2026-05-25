import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { auth, db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { deleteUser } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

export default function DeleteAccount() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { user, guestSession, logout } = useAuth();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const targetEmail = user?.email || guestSession?.email || "";
  const isLoggedIn = !!targetEmail;

  const performDeletion = async () => {
    console.log("[DeleteAccount] performDeletion started!");
    setDeleting(true);
    try {
      const emailToDelete = targetEmail.toLowerCase().trim();
      const uid = user?.uid;

      console.log(`[DeleteAccount] targetEmail: ${emailToDelete}, uid: ${uid}`);

      // 1. Delete candidates record
      console.log("[DeleteAccount] Step 1: Querying candidates collection...");
      const candidatesRef = collection(db, "candidates");
      const candQuery = query(
        candidatesRef,
        where("email", "==", emailToDelete),
      );
      const candSnap = await getDocs(candQuery);
      console.log(`[DeleteAccount] Found ${candSnap.docs.length} candidate docs matching email.`);

      let candidateId = uid; // default fallback
      for (const d of candSnap.docs) {
        candidateId = d.id;
        console.log(`[DeleteAccount] Deleting candidate document: ${d.id}`);
        await deleteDoc(doc(db, "candidates", d.id));
      }

      // Also try to find candidate by id if uid is present
      if (uid) {
        console.log(`[DeleteAccount] Checking candidate doc directly by UID: ${uid}`);
        const directCandDoc = doc(db, "candidates", uid);
        const directCandSnap = await getDoc(directCandDoc);
        if (directCandSnap.exists()) {
          console.log(`[DeleteAccount] Deleting direct candidate document: ${uid}`);
          await deleteDoc(directCandDoc);
        }
      }

      // 2. Delete attendance records
      if (candidateId) {
        console.log(`[DeleteAccount] Step 2: Querying attendance for candidateId: ${candidateId}...`);
        const attendanceRef = collection(db, "attendance");
        const attQuery = query(
          attendanceRef,
          where("candidateId", "==", candidateId),
        );
        const attSnap = await getDocs(attQuery);
        console.log(`[DeleteAccount] Found ${attSnap.docs.length} attendance records.`);
        for (const d of attSnap.docs) {
          console.log(`[DeleteAccount] Deleting attendance document: ${d.id}`);
          await deleteDoc(doc(db, "attendance", d.id));
        }
      }

      // 3. Mark guestList record as deleted
      console.log("[DeleteAccount] Step 3: Querying guestList collection...");
      const guestListRef = collection(db, "guestList");
      const guestQuery = query(
        guestListRef,
        where("email", "==", emailToDelete),
      );
      const guestSnap = await getDocs(guestQuery);
      console.log(`[DeleteAccount] Found ${guestSnap.docs.length} guestList docs.`);
      for (const d of guestSnap.docs) {
        console.log(`[Deletion] Marking guestList document as deleted: ${d.id}`);
        await updateDoc(doc(db, "guestList", d.id), {
          isDeleted: true,
          isDelete: true,
          status: "pending",
          qrToken: null,
          registeredAt: null,
        });
      }

      // 4. Delete Firestore users doc if firebase user
      if (uid) {
        console.log(`[DeleteAccount] Step 4: Deleting users collection doc for uid: ${uid}...`);
        await deleteDoc(doc(db, "users", uid));
      }

      // 5. Delete Firebase Auth User if logged in
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("[DeleteAccount] Step 5: Deleting Firebase auth user account...");
        await deleteUser(currentUser);
        console.log("[DeleteAccount] Firebase auth user deleted successfully.");
      }

      // 6. Clear session and log out
      console.log("[DeleteAccount] Step 6: Logging out and clearing AsyncStorage session...");
      await logout();
      console.log("[DeleteAccount] Session cleared and logout complete.");

      if (Platform.OS === "web") {
        window.alert("Your account and all associated data have been permanently deleted.");
        router.replace("/(auth)/login");
      } else {
        Alert.alert(
          "Account Deleted",
          "Your account and all associated data have been permanently deleted.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }],
        );
      }
    } catch (error: any) {
      console.error("[DeleteAccount] Error during account deletion process:", error);

      if (error.code === "auth/requires-recent-login") {
        console.warn("[DeleteAccount] Re-authentication required error caught.");
        if (Platform.OS === "web") {
          window.alert("For security reasons, you must log in again before deleting your account.");
          await logout();
          router.replace("/(auth)/login");
        } else {
          Alert.alert(
            "Re-authentication Required",
            "For security reasons, you must log in again before deleting your account.",
            [
              {
                text: "Log Out and Re-login",
                onPress: async () => {
                  await logout();
                  router.replace("/(auth)/login");
                },
              },
            ],
          );
        }
      } else {
        if (Platform.OS === "web") {
          window.alert("An error occurred while deleting your data. Please contact synergysphere@gryphonacademy.co.in for assistance.");
        } else {
          Alert.alert(
            "Deletion Failed",
            "An error occurred while deleting your data. Please contact synergysphere@gryphonacademy.co.in for assistance.",
          );
        }
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    console.log("[DeleteAccount] handleDeleteAccount button pressed!");
    console.log(`[DeleteAccount] isLoggedIn: ${isLoggedIn}, targetEmail: "${targetEmail}", confirmEmail: "${confirmEmail}"`);

    if (!isLoggedIn) {
      console.warn("[DeleteAccount] Cannot delete: not logged in.");
      if (Platform.OS === "web") {
        window.alert("No active session found. Please log in first.");
      } else {
        Alert.alert("Error", "No active session found. Please log in first.");
      }
      return;
    }

    if (confirmEmail.trim().toLowerCase() !== targetEmail.toLowerCase()) {
      console.warn(`[DeleteAccount] Cannot delete: email mismatch. Entered: "${confirmEmail.trim().toLowerCase()}", Target: "${targetEmail.toLowerCase()}"`);
      if (Platform.OS === "web") {
        window.alert("The entered email address does not match your account email.");
      } else {
        Alert.alert(
          "Error",
          "The entered email address does not match your account email.",
        );
      }
      return;
    }

    console.log("[DeleteAccount] Prompting deletion confirmation dialog.");
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you absolutely sure you want to delete your account? This will permanently delete all your data, registrations, and check-in records. This action CANNOT be undone."
      );
      if (confirmed) {
        console.log("[DeleteAccount] User confirmed via window.confirm. Calling performDeletion.");
        performDeletion();
      } else {
        console.log("[DeleteAccount] User cancelled window.confirm.");
      }
    } else {
      Alert.alert(
        "Confirm Deletion",
        "Are you absolutely sure you want to delete your account? This will permanently delete all your data, registrations, and check-in records. This action CANNOT be undone.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("[DeleteAccount] User cancelled native Alert."),
          },
          {
            text: "Delete My Account",
            style: "destructive",
            onPress: () => {
              console.log("[DeleteAccount] User clicked Delete on native Alert. Calling performDeletion.");
              performDeletion();
            },
          },
        ],
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f9fafb" }}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? "#1e293b" : "#e2e8f0" },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#f8fafc" : "#0f172a"}
          />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Delete Account</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ThemedView
        style={{ padding: 20, backgroundColor: isDark ? "#0f172a" : "#f9fafb" }}
      >
        <ThemedText
          type="title"
          style={{ fontSize: 28, marginBottom: 10, color: "#dc2626" }}
        >
          Delete Your Account
        </ThemedText>

        <ThemedView
          style={{
            backgroundColor: "#fee2e2",
            borderLeftWidth: 4,
            borderLeftColor: "#dc2626",
            padding: 15,
            marginVertical: 20,
            borderRadius: 4,
          }}
        >
          <ThemedText style={{ color: "#991b1b" }}>
            <ThemedText style={{ fontWeight: "bold" }}>⚠️ Warning:</ThemedText>{" "}
            Deleting your account is permanent and cannot be undone. All your
            event data, certificates, and account information will be deleted.
          </ThemedText>
        </ThemedView>

        {isLoggedIn ? (
          <View
            style={[
              styles.interactiveBox,
              {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderColor: isDark ? "#334155" : "#e2e8f0",
              },
            ]}
          >
            <ThemedText
              style={{
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 8,
                color: isDark ? "#f8fafc" : "#0f172a",
              }}
            >
              In-App Account Deletion
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                marginBottom: 15,
                color: isDark ? "#94a3b8" : "#475569",
              }}
            >
              You are currently logged in as{" "}
              <ThemedText style={{ fontWeight: "bold", color: "#4f46e5" }}>
                {targetEmail}
              </ThemedText>
              . To delete your account immediately, please enter your email
              address below to confirm.
            </ThemedText>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                  color: isDark ? "#ffffff" : "#0f172a",
                  borderColor: isDark ? "#475569" : "#cbd5e1",
                },
              ]}
              placeholder={targetEmail}
              placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!deleting}
            />

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                confirmEmail.trim().toLowerCase() !==
                  targetEmail.toLowerCase() && styles.deleteBtnDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={
                deleting ||
                confirmEmail.trim().toLowerCase() !== targetEmail.toLowerCase()
              }
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText style={styles.deleteBtnText}>
                  Permanently Delete My Account
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.interactiveBox,
              {
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                borderColor: isDark ? "#334155" : "#e2e8f0",
              },
            ]}
          >
            <ThemedText
              style={{
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 8,
                color: isDark ? "#f8fafc" : "#0f172a",
              }}
            >
              Not Logged In
            </ThemedText>
            <ThemedText
              style={{ fontSize: 14, color: isDark ? "#94a3b8" : "#475569" }}
            >
              Please log in to your account inside the app to delete it
              instantly. If you cannot access your account, you can submit a
              manual deletion request by contacting support at{" "}
              <ThemedText style={{ fontWeight: "bold", color: "#4f46e5" }}>
                synergysphere@gryphonacademy.co.in
              </ThemedText>
              .
            </ThemedText>
          </View>
        )}

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Before You Delete
        </ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          • All your event attendance records will be deleted{"\n"}• You won't
          be able to access your certificates{"\n"}• Event organizers may no
          longer see your check-in history{"\n"}• This action cannot be reversed
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Data Deletion Timeline
        </ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          1.{" "}
          <ThemedText style={{ fontWeight: "bold" }}>Immediately:</ThemedText>{" "}
          Your account access is terminated
          {"\n"}
          2.{" "}
          <ThemedText style={{ fontWeight: "bold" }}>
            Within 30 days:
          </ThemedText>{" "}
          All personal data is permanently deleted{"\n"}
          3.{" "}
          <ThemedText style={{ fontWeight: "bold" }}>
            Within 90 days:
          </ThemedText>{" "}
          Data is purged from all backups
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Your Rights
        </ThemedText>
        <ThemedText>
          Under data protection regulations (GDPR, CCPA, etc.), you have the
          right to request deletion of your personal data, receive a copy of
          your data before deletion, and have your deletion confirmed in
          writing.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          FAQ
        </ThemedText>

        <ThemedText style={{ fontWeight: "bold", marginVertical: 10 }}>
          Q: Can I recover my account after deletion?
        </ThemedText>
        <ThemedText>
          A: No, account deletion is permanent. Contact support before
          confirming deletion if you're reconsidering.
        </ThemedText>

        <ThemedText style={{ fontWeight: "bold", marginVertical: 10 }}>
          Q: What happens to my event attendance records?
        </ThemedText>
        <ThemedText>
          A: Your personal data will be deleted. Event organizers may retain
          anonymized statistics, but won't be able to link them to you.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 25, marginBottom: 10 }}>
          Contact Support
        </ThemedText>
        <ThemedView
          style={{
            backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
            borderRadius: 8,
            padding: 15,
            marginVertical: 15,
            borderWidth: 1,
            borderColor: isDark ? "#334155" : "#e2e8f0",
          }}
        >
          <ThemedText style={{ fontSize: 14, marginBottom: 8 }}>
            📧{" "}
            <ThemedText style={{ fontWeight: "bold" }}>
              Send Inquiries To:
            </ThemedText>
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: "#4f46e5",
              marginVertical: 5,
            }}
          >
            synergysphere@gryphonacademy.co.in
          </ThemedText>
        </ThemedView>

        <ThemedText
          style={{
            fontSize: 12,
            color: "#666",
            marginTop: 40,
            marginBottom: 20,
          }}
        >
          © 2026 ConnectHQ. All rights reserved.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  interactiveBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
  },
  input: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 15,
  },
  deleteBtn: {
    backgroundColor: "#dc2626",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnDisabled: {
    backgroundColor: "#ef4444",
    opacity: 0.5,
  },
  deleteBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
