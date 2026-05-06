import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  getCandidateByEmail,
  getCandidateByQRToken,
  getGuestByQRToken,
  Candidate,
} from "@/utils/firestore";
import { useAuth } from "@/context/AuthContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string;
    enrollmentType: string;
    department: string;
    qrToken: string;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      let resolvedCandidate: Candidate | null = null;
      let resolvedProfile: {
        name: string;
        email: string;
        role: string;
        enrollmentType: string;
        department: string;
        qrToken: string;
      } | null = null;

      if (user?.email) {
        resolvedCandidate = await getCandidateByEmail(user.email);
      }

      if (!resolvedCandidate) {
        const storedToken = await AsyncStorage.getItem("guestQrToken");
        if (storedToken) {
          resolvedCandidate = await getCandidateByQRToken(storedToken);
          if (!resolvedCandidate) {
            const guest = await getGuestByQRToken(storedToken);
            if (guest) {
              resolvedProfile = {
                name: guest.name,
                email: guest.email,
                role: "attendee",
                enrollmentType: guest.enrollmentType,
                department: "",
                qrToken: guest.qrToken || "",
              };
            }
          }
        }
      }

      if (resolvedCandidate) {
        resolvedProfile = {
          name: resolvedCandidate.name,
          email: resolvedCandidate.email,
          role: resolvedCandidate.role,
          enrollmentType: resolvedCandidate.enrollmentType,
          department: resolvedCandidate.department || "",
          qrToken: resolvedCandidate.qrToken,
        };
      }

      setProfile(resolvedProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSignOut = async () => {
    await AsyncStorage.removeItem("guestQrToken");
    if (user) {
      await logout();
    }
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
    department: "",
    qrToken: "",
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-full bg-slate-50 items-center justify-center mb-5 border border-slate-100 shadow-sm">
            <Ionicons name="person" size={32} color="#64748b" />
          </View>
          <Text className="text-2xl font-black text-slate-900 leading-tight">
            {safeProfile.name}
          </Text>
          <Text className="text-sm font-semibold text-slate-400 mt-1">
            {safeProfile.email}
          </Text>
        </View>

        <View className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-8">
          <View className="flex-row justify-between items-center py-4 border-b border-white/50">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Role
            </Text>
            <Text className="text-sm font-bold text-slate-900 capitalize">
              {safeProfile.role}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-4 border-b border-white/50">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Enrollment
            </Text>
            <Text className="text-sm font-black text-indigo-600 capitalize">
              {safeProfile.enrollmentType}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-4 border-b border-white/50">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Department
            </Text>
            <Text className="text-sm font-bold text-slate-900 capitalize">
              {safeProfile.department || "—"}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-4">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Pass ID
            </Text>
            <Text className="text-sm font-black text-slate-900 font-mono">
              {safeProfile.qrToken
                ? `EVNT-2025-${safeProfile.qrToken.substring(0, 4).toUpperCase()}`
                : "EVNT-2025-—"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="flex-row items-center justify-center bg-slate-900 rounded-2xl py-4 gap-2 shadow-sm"
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text className="text-white text-base font-bold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});
