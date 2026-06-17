import { useAuth } from "@/context/AuthContext";
import { getEnrollmentDisplayName } from "@/hooks/use-attendee-theme";
import {
  Candidate,
  getCandidateByEmail,
  getCandidateByQRToken,
  getGuestByQRToken,
} from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string;
    enrollmentType: string;
    companyName: string;
    qrToken: string;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedCandidate: Candidate | null = null;
      let companyName = "";
      let resolvedProfile: {
        name: string;
        email: string;
        role: string;
        enrollmentType: string;
        companyName: string;
        qrToken: string;
      } | null = null;

      console.log("=== LOADING PROFILE ===");
      console.log("Current user:", user?.email);

      if (user?.email) {
        console.log("Fetching candidate by email:", user.email);
        resolvedCandidate = await getCandidateByEmail(user.email);
        console.log(
          "Candidate from email:",
          JSON.stringify(resolvedCandidate, null, 2),
        );
      }

      if (!resolvedCandidate) {
        const storedToken = await AsyncStorage.getItem("guestQrToken");
        console.log("Guest QR token from storage:", storedToken);

        if (storedToken) {
          resolvedCandidate = await getCandidateByQRToken(storedToken);
          console.log(
            "Candidate from QR token:",
            JSON.stringify(resolvedCandidate, null, 2),
          );

          if (!resolvedCandidate) {
            const guest = await getGuestByQRToken(storedToken);
            console.log("Guest from QR token:", JSON.stringify(guest, null, 2));

            if (guest) {
              companyName = guest.companyName || "";
              resolvedProfile = {
                name: guest.name,
                email: guest.email,
                role: "attendee",
                enrollmentType: guest.enrollmentType,
                companyName: guest.companyName || "",
                qrToken: guest.qrToken || "",
              };
              console.log("Created profile from guest:", resolvedProfile);
            }
          }
        }
      }

      if (resolvedCandidate) {
        // Fetch the guest data to get companyName since it's not in candidates
        let guestCompanyName = "";
        try {
          const guest = await getGuestByQRToken(resolvedCandidate.qrToken);
          if (guest) {
            guestCompanyName = guest.companyName || "";
            console.log("Found guest data with companyName:", guestCompanyName);
          }
        } catch (err) {
          console.log("Could not fetch guest data for company name");
        }

        console.log("Raw candidate data:", {
          id: resolvedCandidate.id,
          name: resolvedCandidate.name,
          email: resolvedCandidate.email,
          role: resolvedCandidate.role,
          enrollmentType: resolvedCandidate.enrollmentType,
          qrToken: resolvedCandidate.qrToken,
        });

        resolvedProfile = {
          name: resolvedCandidate.name,
          email: resolvedCandidate.email,
          role: resolvedCandidate.role,
          enrollmentType: resolvedCandidate.enrollmentType,
          companyName: guestCompanyName || "",
          qrToken: resolvedCandidate.qrToken,
        };
        console.log(
          "Final profile from candidate with company name:",
          resolvedProfile,
        );
      }

      console.log("Final profile state:", resolvedProfile);
      setProfile(resolvedProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const handleSignOut = async () => {
    // logout() in AuthContext clears both Firebase auth and guest session from AsyncStorage
    await logout();
    router.replace("/(auth)/login");
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const safeProfile = profile || {
    name: "Guest",
    email: "—",
    role: "attendee",
    enrollmentType: "event",
    companyName: "",
    qrToken: "",
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 30,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header Card */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-slate-50 items-center justify-center mb-4 border border-slate-100 shadow-sm">
            <Ionicons name="person" size={32} color="#6366f1" />
          </View>
          <Text className="text-2xl font-black text-slate-900 leading-tight">
            {safeProfile.name}
          </Text>
          <Text className="text-sm font-semibold text-slate-400 mt-1">
            {safeProfile.email}
          </Text>
        </View>

        {/* Account Information Section */}
        <View className="mb-6">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 px-1">
            Account Information
          </Text>
          
          <View className="flex-row justify-between items-center py-4 border-b border-slate-50">
            <View className="flex-row items-center gap-3">
              <Ionicons name="shield-outline" size={20} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-700">Role</Text>
            </View>
            <Text className="text-sm font-bold text-slate-900 capitalize">
              {safeProfile.role}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-4 border-b border-slate-50">
            <View className="flex-row items-center gap-3">
              <Ionicons name="ribbon-outline" size={20} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-700">Enrollment</Text>
            </View>
            <Text
              className="text-sm font-black text-indigo-600 capitalize text-right"
              style={{ maxWidth: "55%", flexShrink: 1 }}
              numberOfLines={2}
            >
              {getEnrollmentDisplayName(safeProfile.enrollmentType)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-4 border-b border-slate-50">
            <View className="flex-row items-center gap-3">
              <Ionicons name="business-outline" size={20} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-700">Company</Text>
            </View>
            <Text className="text-sm font-bold text-slate-900 capitalize">
              {safeProfile.companyName || "—"}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-4 border-b border-slate-50">
            <View className="flex-row items-center gap-3">
              <Ionicons name="qr-code-outline" size={20} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-700">Pass ID</Text>
            </View>
            <Text className="text-sm font-black text-slate-900 font-mono">
              {safeProfile.qrToken
                ? `EVNT-2025-${safeProfile.qrToken.substring(0, 4).toUpperCase()}`
                : "EVNT-2025-—"}
            </Text>
          </View>
        </View>

        {/* Help & Support Section */}
        <View className="mb-8">
          <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 px-1">
            Help & Support
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row justify-between items-center py-4 border-b border-slate-50"
            onPress={() => router.push("/about")}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              <Text className="text-sm font-semibold text-slate-800">
                About Gryphon Academy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row justify-between items-center py-4 border-b border-slate-50"
            onPress={() => router.push("/delete-account")}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
              <Text className="text-sm font-semibold text-red-600">
                Delete Account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          className="border border-indigo-600 rounded-full py-3.5 items-center justify-center mt-2"
          onPress={handleSignOut}
        >
          <Text className="text-indigo-600 text-base font-bold">Logout</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <Text className="text-center text-xs font-semibold text-slate-400 mt-6">
          App Version 1.0.1
        </Text>
      </ScrollView>
    </View>
  );
}
