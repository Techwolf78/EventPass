import { auth, db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DeleteAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, guestSession, logout } = useAuth();
  const { palette, loading: themeLoading } = useAttendeeTheme();
  
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const targetEmail = user?.email || guestSession?.email || "";
  const isLoggedIn = !!targetEmail;
  const themeColor = palette.primary;

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

  const isEmailMatch = confirmEmail.trim().toLowerCase() === targetEmail.toLowerCase();

  if (themeLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View 
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          paddingHorizontal: 16,
          paddingBottom: 14,
          paddingTop: insets.top > 0 ? insets.top + 8 : 20,
          backgroundColor: "#ffffff",
        }}
      >
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={themeColor} />
        </TouchableOpacity>
        
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text 
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: "#0f172a",
              letterSpacing: -0.25,
            }}
          >
            Delete Account
          </Text>
          <Text 
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#64748b",
              marginTop: 1,
            }}
          >
            {targetEmail || "Not logged in"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Callout */}
        <View
          style={{
            backgroundColor: "#fef2f2",
            borderWidth: 1,
            borderColor: "#fee2e2",
            borderRadius: 20,
            padding: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <Ionicons name="warning" size={20} color="#ef4444" style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", color: "#991b1b", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Warning
            </Text>
            <Text style={{ color: "#b91c1c", fontSize: 13, fontWeight: "600", marginTop: 4, lineHeight: 18 }}>
              Deleting your account is permanent and cannot be undone. All your event data, certificates, and check-in history will be deleted.
            </Text>
          </View>
        </View>

        {/* In-App Account Deletion Box */}
        {isLoggedIn ? (
          <View 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: "#f1f5f9",
              marginBottom: 24,
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.01,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "900", color: themeColor, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
              In-App Account Deletion
            </Text>
            
            <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "600", lineHeight: 20, marginBottom: 16 }}>
              You are currently logged in as{" "}
              <Text style={{ fontWeight: "800", color: "#0f172a" }}>
                {targetEmail}
              </Text>
              . To confirm and execute deletion immediately, please type your email below.
            </Text>

            <TextInput
              style={{
                height: 48,
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                paddingHorizontal: 16,
                fontSize: 14,
                fontWeight: "600",
                color: "#0f172a",
                marginBottom: 16,
              }}
              placeholder="Enter your email address"
              placeholderTextColor="#94a3b8"
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!deleting}
            />

            <TouchableOpacity
              style={{
                backgroundColor: isEmailMatch ? "#dc2626" : "#fca5a5",
                height: 48,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity: deleting ? 0.7 : 1,
              }}
              onPress={handleDeleteAccount}
              disabled={deleting || !isEmailMatch}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 14 }}>
                    Permanently Delete My Account
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View 
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: "#f1f5f9",
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "900", color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
              Not Logged In
            </Text>
            <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "600", lineHeight: 20 }}>
              Please log in to your account inside the app to delete it instantly. If you cannot access your account, you can submit a manual deletion request by contacting support at{" "}
              <Text style={{ fontWeight: "800", color: "#4f46e5" }}>
                synergysphere@gryphonacademy.co.in
              </Text>
              .
            </Text>
          </View>
        )}

        {/* Before You Delete Section */}
        <View 
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
            Before You Delete
          </Text>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}>
                All event attendance records will be deleted
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}>
                You won't be able to access your certificates
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}>
                Event organizers won't see your check-in history
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="alert-circle-outline" size={18} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#b91c1c" }}>
                This action is permanent and cannot be reversed
              </Text>
            </View>
          </View>
        </View>

        {/* Data Deletion Timeline */}
        <View 
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
            Data Deletion Timeline
          </Text>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ backgroundColor: "#f1f5f9", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748b" }}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>Immediately</Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Your account access is terminated.</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ backgroundColor: "#f1f5f9", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748b" }}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>Within 30 Days</Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>All personal data is permanently deleted from servers.</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ backgroundColor: "#f1f5f9", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748b" }}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>Within 90 Days</Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Data is completely purged from all system backups.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Your Rights */}
        <View 
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
            Your Rights
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "600", lineHeight: 20 }}>
            Under data protection regulations (GDPR, CCPA, etc.), you have the right to request deletion of your personal data, receive a copy of your data before deletion, and have your deletion confirmed in writing.
          </Text>
        </View>

        {/* FAQ Section */}
        <View 
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
            FAQ
          </Text>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>
                Can I recover my account after deletion?
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 18 }}>
                No, account deletion is permanent. Contact support before confirming deletion if you're reconsidering.
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#334155" }}>
                What happens to my event attendance records?
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 18 }}>
                Your personal data will be deleted. Event organizers may retain anonymized statistics, but won't be able to link them to you.
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Support */}
        <View 
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            marginBottom: 32,
            alignItems: "center",
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Ionicons name="mail" size={20} color={themeColor} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
            Send Inquiries To
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "800", color: themeColor }}>
            synergysphere@gryphonacademy.co.in
          </Text>
        </View>

        <Text style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
          © 2026 ConnectHQ. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}
