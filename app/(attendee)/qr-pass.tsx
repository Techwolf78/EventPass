import CertificateCard from "@/components/qr-pass/CertificateCard";
import DefaultPass from "@/components/qr-pass/DefaultPass";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Candidate,
  CheckInStatusResult,
  getCandidateByEmail,
  getCandidateByQRToken,
  getGuestByQRToken,
  subscribeToCheckInStatus,
} from "../../utils/firestore";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NAVY = "#0F172A";
const GOLD = "#D4AF37";
const GOLD_L = "#FAF8F5";
const WHITE = "#ffffff";

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const [showPassAnyway, setShowPassAnyway] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const certificateRef = useRef<any>(null);

  const qrSize = Math.min(width * 0.5, 220);
  const activeToken = resolvedToken || (qrToken as string);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | null = null;

    const setupData = async () => {
      let token: string | null = (qrToken as string) || null;

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

      try {
        const candidateData = await getCandidateByQRToken(token);

        // Fetch company name from guestList
        let companyName = "";
        if (candidateData) {
          try {
            const guest = await getGuestByQRToken(token);
            if (guest) {
              companyName = guest.companyName || "";
              console.log("Found company name from guestList:", companyName);
            }
          } catch (err) {
            console.log("Could not fetch guest data for company name");
          }
        }

        // Merge companyName into candidate data
        const candidateWithCompany = candidateData
          ? {
              ...candidateData,
              companyName: companyName,
            }
          : null;

        setCandidate(candidateWithCompany);
      } catch (error) {
        console.error("Error fetching candidate data:", error);
      }

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const token = activeToken;
    if (token) {
      try {
        const candidateData = await getCandidateByQRToken(token);

        // Fetch company name from guestList on refresh
        let companyName = "";
        if (candidateData) {
          try {
            const guest = await getGuestByQRToken(token);
            if (guest) {
              companyName = guest.companyName || "";
            }
          } catch (err) {
            console.log("Could not fetch guest data for company name");
          }
        }

        const candidateWithCompany = candidateData
          ? {
              ...candidateData,
              companyName: companyName,
            }
          : null;

        setCandidate(candidateWithCompany);
      } catch (error) {
        console.error("Error fetching candidate data on refresh:", error);
      }
    }
    setRefreshing(false);
  }, [activeToken]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const isMasterclass =
    candidate?.enrollmentType?.toLowerCase() === "masterclass";
  const eventName = isMasterclass ? "MASTERCLASS 3.0" : "SYNERGY SPHERE 2.0";
  const eventDate = "June 27, 2026";
  const eventLocation = "Ritz-Carlton, Pune";

  const brandColor = isMasterclass ? "#06b6d4" : "#ef4444";
  const brandBg = isMasterclass ? "bg-teal-600" : "bg-red-500";
  const brandShadow = isMasterclass ? "shadow-teal-200" : "shadow-red-200";
  const brandText = isMasterclass ? "text-teal-600" : "text-red-500";
  const brandAccentBg = isMasterclass ? "bg-teal-50" : "bg-red-50";
  const brandAccentText = isMasterclass ? "text-teal-700" : "text-red-700";

  const uniqueId = candidate?.qrToken
    ? `EVNT-2025-${candidate.qrToken.substring(0, 4).toUpperCase()}`
    : "EVNT-2025-XXXX";

  const eventDateTime = new Date("2026-06-27");
  eventDateTime.setHours(23, 59, 59, 999);
  const now = new Date();
  const isPostEvent = now > eventDateTime;

  // ── Download handler ────────────────────────────────────────────────────────
  const handleDownloadCertificate = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    setIsSaved(false);
    let fileUri = "";
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        alert(
          "Permission to access gallery is required to save the certificate.",
        );
        setIsDownloading(false);
        return;
      }

      const uri = await certificateRef.current.capture();
      const name = candidate?.name || "Attendee";
      const fileName = `${name.replace(/\s+/g, "_")}_${Date.now()}.png`;
      fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.copyAsync({ from: uri, to: fileUri });
      await MediaLibrary.createAssetAsync(fileUri);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      alert("Saved to Gallery!");
    } catch (error) {
      console.error("Error capturing certificate:", error);
      alert("Failed to download certificate");
    } finally {
      if (fileUri) {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      setIsDownloading(false);
    }
  };

  // ── No token ────────────────────────────────────────────────────────────────
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
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text className="text-rose-600 text-base font-bold mr-2">
              Back to Login
            </Text>
            <Ionicons name="arrow-back" size={18} color="#e11d48" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
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

  // ── Post-Event Screen ───────────────────────────────────────────────────────
  if (isPostEvent) {
    return (
      <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 48,
            paddingTop: 20,
          }}
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ── Hero ── */}
          <View className="items-center mb-8 mt-4">
            <View
              className={`w-20 h-20 rounded-full ${brandAccentBg} items-center justify-center mb-4`}
            >
              <Ionicons name="ribbon" size={38} color={brandColor} />
            </View>
            <Text
              className="text-2xl font-black text-slate-900 text-center leading-tight"
              style={{ letterSpacing: -0.3 }}
            >
              Thank You for Being Part of{"\n"}
              {eventName}
            </Text>
            <Text className="text-sm text-slate-400 font-medium text-center mt-3 px-6 leading-6">
              The event may be over, but the memories and connections live on.
              Here is your official attendance certificate.
            </Text>
          </View>

          {/* ── Premium Certificate ── */}
          <View style={{ marginHorizontal: -4, marginBottom: 28 }}>
            <CertificateCard
              candidateName={candidate?.name || "Valued Attendee"}
              eventName={eventName}
              eventLocation={eventLocation}
              eventDate={eventDate}
              uniqueId={uniqueId}
              certRef={certificateRef}
            />
          </View>

          {/* ── Download Button ── */}
          <TouchableOpacity
            style={{
              backgroundColor: NAVY,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              marginBottom: 12,
              shadowColor: NAVY,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 6,
              opacity: isDownloading || isSaved ? 0.75 : 1,
            }}
            onPress={handleDownloadCertificate}
            disabled={isDownloading || isSaved}
          >
            {isDownloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : isSaved ? (
              <Ionicons name="checkmark-circle" size={20} color={GOLD} />
            ) : (
              <Ionicons name="download-outline" size={20} color={GOLD} />
            )}
            <Text
              style={{
                color: isDownloading ? "#fff" : isSaved ? GOLD : "#fff",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 8,
                letterSpacing: 0.2,
              }}
            >
              {isDownloading
                ? "Downloading..."
                : isSaved
                  ? "Saved to Gallery!"
                  : "Download Certificate"}
            </Text>
          </TouchableOpacity>

          {/* ── Secondary Actions ── */}
          <View className="flex-row justify-between mb-4">
            <TouchableOpacity
              className="w-[48%] bg-white border border-slate-100 rounded-2xl py-4 items-center justify-center flex-row shadow-sm"
              onPress={() => router.push("/(attendee)/gallery")}
            >
              <Ionicons name="images-outline" size={18} color="#475569" />
              <Text className="text-slate-700 text-sm font-bold ml-2">
                Event Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-[48%] bg-white border border-slate-100 rounded-2xl py-4 items-center justify-center flex-row shadow-sm"
              onPress={() => router.push("/(attendee)/attendees")}
            >
              <Ionicons name="people-outline" size={18} color="#475569" />
              <Text className="text-slate-700 text-sm font-bold ml-2">
                Connect
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-white border border-slate-100 rounded-2xl py-4 items-center justify-center flex-row shadow-sm mb-8"
            onPress={() => {
              /* Handle Share */
            }}
          >
            <Ionicons name="share-social-outline" size={20} color="#475569" />
            <Text className="text-slate-700 text-base font-bold ml-2">
              Share Achievement
            </Text>
          </TouchableOpacity>

          {/* ── Highlights ── */}
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
              Event Highlights
            </Text>
            <View className="flex-row flex-wrap justify-between">
              <View className="w-[48%] mb-4">
                <Text className="text-2xl font-black text-slate-800">500+</Text>
                <Text className="text-xs text-slate-400 font-semibold mt-0.5">
                  Attendees
                </Text>
              </View>
              <View className="w-[48%] mb-4">
                <Text className="text-2xl font-black text-slate-800">12</Text>
                <Text className="text-xs text-slate-400 font-semibold mt-0.5">
                  Speakers
                </Text>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm font-bold text-slate-800">
                  AI & Leadership
                </Text>
                <Text className="text-xs text-slate-400 font-semibold mt-0.5">
                  Sessions
                </Text>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm font-bold text-slate-800">
                  Networking
                </Text>
                <Text className="text-xs text-slate-400 font-semibold mt-0.5">
                  Experience
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-center text-[11px] text-slate-400 font-semibold px-10 leading-relaxed">
            Thank you for being part of the Gryphon Academy community.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── Check-in Scenarios ──────────────────────────────────────────────────────
  if (checkInStatus?.hasCheckedIn) {
    const checkedInAt = checkInStatus.checkedInAt;
    const checkInDate =
      checkedInAt instanceof Object && "toDate" in checkedInAt
        ? checkedInAt.toDate()
        : new Date(checkedInAt as any);

    const diffInMinutes = (now.getTime() - checkInDate.getTime()) / (1000 * 60);
    const isSameDay = checkInDate.toDateString() === now.toDateString();

    let scenario: "celebration" | "info" | "warning" = "info";
    if (diffInMinutes >= 0 && diffInMinutes <= 2) scenario = "celebration";
    else if (isSameDay) scenario = "info";
    else scenario = "warning";

    // ── Celebration (0–2 min) ──
    if (scenario === "celebration" && !showPassAnyway) {
      return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: insets.bottom + 40,
              paddingTop: 60,
            }}
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View className="items-center mb-12">
              <View
                className={`${checkInStatus.isFirstTimeCheckIn ? "w-16 h-16" : "w-24 h-24"} rounded-full ${brandAccentBg} items-center justify-center mb-6`}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={checkInStatus.isFirstTimeCheckIn ? 48 : 80}
                  color={brandColor}
                />
              </View>
              <Text
                className={`${checkInStatus.isFirstTimeCheckIn ? "text-3xl" : "text-4xl"} font-bold text-slate-900 text-center mb-2 tracking-tight`}
              >
                {checkInStatus.isFirstTimeCheckIn ? "Welcome" : "Welcome back"}{" "}
                {checkInStatus.candidateName}!
              </Text>
              <Text className="text-xl text-slate-500 font-semibold text-center">
                {"You're"} all checked in!
              </Text>
              <Text className="text-base text-slate-400 text-center mt-3 px-4 leading-6">
                Get ready for an amazing experience at the event. {"We're"} glad
                to have you here.
              </Text>
            </View>

            <View className="mb-10">
              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-6 text-center">
                Quick Actions
              </Text>
              <View className="flex-row flex-wrap justify-between">
                <TouchableOpacity
                  className="w-[48%] bg-white rounded-3xl p-6 items-center justify-center border border-slate-100 shadow-sm mb-4"
                  onPress={() => router.push("/(attendee)/attendees")}
                >
                  <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-3">
                    <Ionicons name="people" size={28} color="#3b82f6" />
                  </View>
                  <Text className="text-slate-800 font-bold text-sm">
                    Attendees
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-[48%] bg-white rounded-3xl p-6 items-center justify-center border border-slate-100 shadow-sm mb-4"
                  onPress={() =>
                    router.push({
                      pathname: "/(attendee)/agenda",
                      params: { qrToken: activeToken },
                    })
                  }
                >
                  <View
                    className={`w-14 h-14 rounded-2xl ${brandAccentBg} items-center justify-center mb-3`}
                  >
                    <Ionicons name="calendar" size={28} color={brandColor} />
                  </View>
                  <Text className="text-slate-800 font-bold text-sm">
                    Agenda
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-full bg-white rounded-3xl p-6 items-center justify-center border border-slate-100 shadow-sm mb-4 flex-row"
                  onPress={() => router.push("/(attendee)/gallery")}
                >
                  <View className="w-12 h-12 rounded-2xl bg-rose-50 items-center justify-center mr-4">
                    <Ionicons name="images" size={24} color="#f43f5e" />
                  </View>
                  <Text className="text-slate-800 font-bold text-base">
                    Event Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="items-center mt-2">
              <View className={`${brandAccentBg} px-4 py-2 rounded-full`}>
                <Text
                  className={`${brandAccentText} font-black text-[10px] uppercase tracking-[1px]`}
                >
                  Let the celebration begin!
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    // ── Info (Today, 2+ min) ──
    if (scenario === "info") {
      return (
        <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: insets.bottom + 80,
              paddingTop: 40,
            }}
            className="flex-1 px-2"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View className="items-center mb-8">
              <View
                className={`w-20 h-20 rounded-full ${brandAccentBg} items-center justify-center mb-4`}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={brandColor}
                />
              </View>
              <Text className="text-3xl font-black text-slate-900 text-center">
                {"You're"} Checked In!
              </Text>
              <Text className="text-base text-slate-500 font-bold text-center mt-1">
                {checkInStatus.isFirstTimeCheckIn ? "Welcome" : "Welcome back"},{" "}
                {checkInStatus.candidateName}!
              </Text>
            </View>

            {/* Check-in Details - Only Email and Time side by side */}
            <View className="bg-white rounded-3xl p-4 shadow-xl shadow-slate-200 border border-slate-100 mb-8">
              <Text className="text-xs text-blue-500 uppercase tracking-widest mb-4 text-center">
                Check-in Details
              </Text>

              {/* Horizontal 2-column layout */}
              <View className="flex-row justify-between items-center gap-4">
                {/* Email Column */}
                <View className="flex-1 items-center">
                  <Text className="text-[9px] font-bold text-slate-400 uppercase text-center">
                    Email
                  </Text>
                  <Text
                    className="text-[11px] font-bold text-slate-800 text-center mt-1"
                    numberOfLines={1} // ← Single line only
                    adjustsFontSizeToFit
                    minimumFontScale={0.7} // ← Smaller min scale to fit long emails
                  >
                    {checkInStatus.candidateEmail || ""}
                  </Text>
                </View>

                {/* Time Column */}
                <View className="flex-1 items-center">
                  <Text className="text-[9px] font-bold text-slate-400 uppercase text-center">
                    Time
                  </Text>
                  <Text className="text-xs font-bold text-slate-800 text-center mt-1">
                    {checkInDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* About Event Section */}
            <View className="bg-white rounded-3xl px-4 py-5 shadow-xl shadow-slate-200 border border-slate-100 mb-8">
              <Text
                className={`text-[11px] font-black ${brandText} uppercase tracking-[1px] mb-2`}
              >
                About Event
              </Text>
              <Text className="text-lg font-bold text-slate-900 mb-1">
                {eventName}
              </Text>
              <Text className="text-sm text-slate-600 leading-relaxed">
                {isMasterclass
                  ? " Unlock Your Leadership Potential! An intensive, high-impact session crafted for visionaries. Learn AI strategies that drive results and connect with the best in the industry."
                  : " The Ultimate Networking Experience! Connect with 500+ industry leaders, discover game-changing insights, and create lasting partnerships. Your next big opportunity awaits!"}
              </Text>
            </View>

            <TouchableOpacity
              className={`${brandBg} rounded-2xl py-4 items-center justify-center flex-row shadow-lg ${brandShadow} mb-6`}
              onPress={() =>
                router.push({
                  pathname: "/(attendee)/agenda",
                  params: { qrToken: activeToken },
                })
              }
            >
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text className="text-white text-lg font-bold ml-2">
                View Agenda
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    // ── Warning (previous day / old check-in) ──
    return (
      <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 40,
            paddingTop: 40,
          }}
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-4">
              <Ionicons name="ribbon" size={40} color="#4f46e5" />
            </View>
            <Text className="text-3xl font-black text-slate-900 text-center">
              Thank You for Attending!
            </Text>
            <Text className="text-base text-slate-500 font-bold text-center mt-2 px-4 leading-6">
              We hope you had a rewarding experience at {eventName}.
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200 border border-slate-100 mb-8">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Digital Attendance Badge
              </Text>
              <View className="bg-indigo-50 px-3 py-1 rounded-full">
                <Text className="text-indigo-600 text-[10px] font-black uppercase">
                  Verified
                </Text>
              </View>
            </View>

            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="person" size={32} color="#64748b" />
              </View>
              <Text className="text-xl font-bold text-slate-800">
                {checkInStatus.candidateName}
              </Text>
              <Text className="text-sm text-slate-500">
                {checkInStatus.candidateEmail}
              </Text>
            </View>

            <View className="h-[1px] bg-slate-100 mb-6" />

            <View className="gap-4">
              <View className="flex-row justify-between">
                <Text className="text-xs font-bold text-slate-400 uppercase">
                  Event
                </Text>
                <Text className="text-sm font-bold text-slate-800">
                  {eventName}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs font-bold text-slate-400 uppercase">
                  Date
                </Text>
                <Text className="text-sm font-bold text-slate-800">
                  {eventDate}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-4">
            <TouchableOpacity
              className="bg-indigo-600 rounded-2xl py-4 items-center justify-center flex-row shadow-lg shadow-indigo-200"
              onPress={() => {
                /* Handle Certificate */
              }}
            >
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text className="text-white text-lg font-bold ml-2">
                Download Certificate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white border border-slate-200 rounded-2xl py-4 items-center justify-center flex-row"
              onPress={() => router.push("/(attendee)/gallery")}
            >
              <Ionicons name="images" size={20} color="#475569" />
              <Text className="text-slate-700 text-lg font-bold ml-2">
                View Event Gallery
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="mt-6 items-center"
            onPress={() => router.replace("/(attendee)/agenda")}
          >
            <Text className="text-slate-500 font-bold">Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Default: QR Pass ────────────────────────────────────────────────────────
  const handleViewAgenda = () => {
    router.push({
      pathname: "/(attendee)/agenda",
      params: { qrToken: activeToken },
    });
  };

  return (
    <DefaultPass
      eventName={eventName}
      eventDate={eventDate}
      eventLocation={eventLocation}
      brandBg={brandBg}
      brandText={brandText}
      brandShadow={brandShadow}
      insets={insets}
      activeToken={activeToken}
      qrSize={qrSize}
      candidate={candidate}
      uniqueId={uniqueId}
      refreshing={refreshing}
      onRefresh={onRefresh}
      handleViewAgenda={handleViewAgenda}
      setQrRef={setQrRef}
      isMasterclass={isMasterclass}
    />
  );
}
