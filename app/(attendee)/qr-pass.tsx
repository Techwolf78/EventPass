import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Sharing from "expo-sharing";
import {
  CheckInStatusResult,
  getCandidateByQRToken,
  getCandidateByEmail,
  Candidate,
  subscribeToCheckInStatus,
} from "../../utils/firestore";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";

export default function QRPassScreen() {
  const router = useRouter();
  const { qrToken } = useLocalSearchParams();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [qrRef, setQrRef] = useState<any>(null);
  const [checkInStatus, setCheckInStatus] =
    useState<CheckInStatusResult | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedToken, setResolvedToken] = useState<string | null>(
    (qrToken as string) || null,
  );

  const qrSize = Math.min(width * 0.5, 220);
  const activeToken = resolvedToken || (qrToken as string);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | null = null;

    const setupData = async () => {
      let token: string | null = (qrToken as string) || null;

      // 1. Resolve Token
      if (!token && user?.email) {
        try {
          const candidateByEmail = await getCandidateByEmail(user.email);
          if (candidateByEmail) {
            token = candidateByEmail.qrToken;
            setResolvedToken(token);
          }
        } catch (error) {
          console.error("Error fetching candidate by email:", error);
        }
      }

      if (!token) {
        try {
          const storedToken = await AsyncStorage.getItem("guestQrToken");
          if (storedToken) {
            token = storedToken;
            setResolvedToken(token);
          }
        } catch (error) {
          console.error("Error reading guest token:", error);
        }
      }

      if (!token) {
        setLoading(false);
        return;
      }

      // 2. Fetch Candidate Info Once
      try {
        const candidateData = await getCandidateByQRToken(token);
        setCandidate(candidateData);
      } catch (error) {
        console.error("Error fetching candidate data:", error);
      }

      // 3. Listen for Check-In Status in Real-Time
      unsubscribeStatus = subscribeToCheckInStatus(token, (status) => {
        setCheckInStatus(status);
        setLoading(false);
      });
    };

    setupData();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [qrToken, user]);

  if (!activeToken) {
    return (
      <View className="flex-1 bg-rose-500">
        <View
          style={{ paddingTop: insets.top }}
          className="flex-1 justify-center items-center px-5"
        >
          <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={50} color="#fff" />
          </View>
          <Text className="text-3xl font-extrabold text-white mb-2">Oops!</Text>
          <Text className="text-base text-white/90 mb-8 font-medium text-center">
            No QR token found
          </Text>
          <TouchableOpacity
            className="bg-white rounded-xl py-3.5 px-8 flex-row items-center"
            onPress={() => router.replace("/(attendee)/register")}
          >
            <Text className="text-rose-600 text-base font-bold mr-2">
              Back to Registration
            </Text>
            <Ionicons name="arrow-back" size={18} color="#e11d48" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <View
          style={{ paddingTop: insets.top }}
          className="flex-1 justify-center items-center px-5"
        >
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-slate-600 text-base font-semibold mt-4">
            Loading your pass...
          </Text>
        </View>
      </View>
    );
  }

  // Show "Already Checked In" message
  if (checkInStatus?.hasCheckedIn) {
    return (
      <View className="flex-1 bg-emerald-500">
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 40 }}
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-8">
            <Ionicons name="checkmark-circle" size={48} color="#fff" />
            <Text className="text-3xl font-extrabold text-white mt-4">
              Already Checked In!
            </Text>
            <Text className="text-base text-white/90 font-semibold mt-2">
              Welcome to the event
            </Text>
          </View>

          <View className="bg-white rounded-3xl mx-5 mt-5 px-5 py-7 shadow-xl">
            <View className="items-center mb-7">
              <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-4">
                <Ionicons name="checkmark" size={60} color="#10b981" />
              </View>
              <Text className="text-2xl font-extrabold text-slate-900 mb-2 text-center">
                You're All Set!
              </Text>
              <Text className="text-base text-slate-500 font-medium text-center">
                You have already checked in for this event
              </Text>
            </View>

            <View className="bg-emerald-50 rounded-xl px-4 py-5 mb-6 border-l-4 border-emerald-500">
              <View className="mb-4">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="person" size={18} color="#10b981" />
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                    Name
                  </Text>
                </View>
                <Text
                  className="text-base font-semibold text-slate-800 ml-7"
                  numberOfLines={1}
                >
                  {checkInStatus.candidateName}
                </Text>
              </View>

              <View className="mb-4">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="mail" size={18} color="#10b981" />
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                    Email
                  </Text>
                </View>
                <Text
                  className="text-base font-semibold text-slate-800 ml-7"
                  numberOfLines={1}
                >
                  {checkInStatus.candidateEmail}
                </Text>
              </View>

              {checkInStatus.checkedInAt && (
                <View>
                  <View className="flex-row items-center mb-1.5">
                    <Ionicons name="time" size={18} color="#10b981" />
                    <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2">
                      Check-In Time
                    </Text>
                  </View>
                  <Text className="text-base font-semibold text-slate-800 ml-7">
                    {checkInStatus.checkedInAt instanceof Object &&
                    "toDate" in checkInStatus.checkedInAt
                      ? checkInStatus.checkedInAt.toDate().toLocaleString()
                      : "Today"}
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-3">
              <TouchableOpacity
                className="bg-emerald-500 rounded-xl py-4 items-center justify-center flex-row shadow-lg shadow-emerald-500/30"
                onPress={() =>
                  router.push({
                    pathname: "/(attendee)/agenda",
                    params: { qrToken: activeToken },
                  })
                }
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text className="text-white text-base font-bold ml-2">
                  View Agenda
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-emerald-50 rounded-xl py-4 items-center justify-center flex-row border-2 border-emerald-500"
                onPress={() => router.replace("/(attendee)/register")}
              >
                <Ionicons name="home" size={20} color="#10b981" />
                <Text className="text-emerald-500 text-base font-bold ml-2">
                  Back to Home
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text
            className="text-center text-xs text-white/70 mt-5 font-medium px-5 mb-10"
            style={{ paddingBottom: insets.bottom + 100 }}
          >
            Enjoy the event! If you need any assistance, contact the organizers.
          </Text>
        </ScrollView>
      </View>
    );
  }

  const handleSaveToPhotos = async () => {
    try {
      if (qrRef) {
        qrRef.toDataURL((dataURL: string) => {
          Sharing.shareAsync(dataURL, {
            mimeType: "image/png",
            dialogTitle: "Save your ConnectHQ QR Code",
          });
        });
      }
    } catch (error) {
      console.error("Error saving QR code:", error);
    }
  };

  const uniqueId = candidate?.qrToken
    ? `EVNT-2025-${candidate.qrToken.substring(0, 4).toUpperCase()}`
    : "EVNT-2025-XXXX";

  const handleViewAgenda = () => {
    router.push({
      pathname: "/(attendee)/agenda",
      params: { qrToken: activeToken },
    });
  };

  const isMasterclass =
    candidate?.enrollmentType?.toLowerCase() === "masterclass";
  const eventName = isMasterclass ? "MASTERCLASS 3.0" : "SYNERGY SPHERE 3.0";
  const eventDate = "June 27, 2026";
  const eventLocation = "Ritz-Carlton, Pune";

  // Dynamic branding based on enrollment type
  const brandColor = isMasterclass ? "#3b82f6" : "#ef4444"; // Blue for Masterclass, Red for Synergy Sphere
  const brandBg = isMasterclass ? "bg-blue-600" : "bg-red-500";
  const brandShadow = isMasterclass ? "shadow-blue-200" : "shadow-red-200";
  const brandText = isMasterclass ? "text-blue-600" : "text-red-500";

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Event Banner */}
        <View
          className={`${brandBg} border-b-3xl`}
          style={{
            paddingTop: insets.top + 24,
            paddingBottom: 32,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View className="flex-row justify-between items-center px-6">
            <View className="flex-1">
              <Text className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">
                {eventName}
              </Text>
              <View className="flex-row items-center mb-1 gap-2">
                <Ionicons
                  name="calendar"
                  size={13}
                  color="rgba(255,255,255,0.85)"
                />
                <Text className="text-xs text-white/85 font-semibold">
                  {eventDate}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="location"
                  size={13}
                  color="rgba(255,255,255,0.85)"
                />
                <Text
                  className="text-xs text-white/85 font-semibold"
                  numberOfLines={1}
                >
                  {eventLocation}
                </Text>
              </View>
            </View>
            <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
              <Ionicons name="ticket" size={28} color="#fff" />
            </View>
          </View>
        </View>

        {/* Main Card */}
        <View className="bg-white rounded-3xl mx-5 -mt-8 p-6 shadow-2xl shadow-slate-200 border border-slate-50">
          {/* QR Section */}
          <View className="items-center mb-6">
            <View className="bg-white border border-slate-100 rounded-3xl p-5 mb-3 shadow-sm">
              <QRCode
                getRef={setQrRef}
                value={activeToken}
                size={qrSize}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text className="text-[10px] text-slate-400 font-extrabold tracking-[2px] uppercase">
              Scan at entrance
            </Text>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-slate-100 mb-6" />

          {/* Attendee Details */}
          <View className="mb-8">
            <Text
              className={`text-[11px] font-black ${brandText} uppercase tracking-[1px] mb-5`}
            >
              Attendee Pass
            </Text>

            <View className="flex-row mb-5 gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Full Name
                </Text>
                <Text
                  className="text-base font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {candidate?.name || "\u2014"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Email
                </Text>
                <Text
                  className="text-base font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {candidate?.email || "\u2014"}
                </Text>
              </View>
            </View>

            <View className="flex-row mb-5 gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Role
                </Text>
                <Text className="text-base font-bold text-slate-900">
                  {candidate?.role || "Attendee"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Enrollment
                </Text>
                <Text className="text-base font-bold text-slate-900 capitalize">
                  {candidate?.enrollmentType || "\u2014"}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Department
                </Text>
                <Text className="text-base font-bold text-slate-900 capitalize">
                  {candidate?.department || "\u2014"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Pass ID
                </Text>
                <Text
                  className={`text-sm font-black ${brandText} font-mono`}
                  numberOfLines={1}
                >
                  {uniqueId}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              className={`${brandBg} rounded-xl py-4 items-center justify-center flex-row shadow-lg ${brandShadow}`}
              onPress={handleViewAgenda}
            >
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text className="text-white text-base font-bold ml-2">
                View Agenda
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Note */}
        <Text className="text-center text-[11px] text-slate-400 mt-6 font-semibold px-10 leading-relaxed">
          Present this QR code at the entrance for check-in. This pass is valid
          for {eventName}.
        </Text>
      </ScrollView>
    </View>
  );
}
