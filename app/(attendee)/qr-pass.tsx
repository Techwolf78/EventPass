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
  StatusBar,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function QRPassScreen() {
  const router = useRouter();
  const { qrToken } = useLocalSearchParams();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [, setQrRef] = useState<any>(null);
  const [checkInStatus, setCheckInStatus] =
    useState<CheckInStatusResult | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedToken, setResolvedToken] = useState<string | null>(
    (qrToken as string) || null,
  );
  const [showPassAnyway] = useState(false);
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
          } catch {
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
          } catch {
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
  const eventName = isMasterclass ? "Event Pass" : "SYNERGY SPHERE 2.0";
  const eventDate = "June 27, 2026";
  const eventLocation = "Ritz-Carlton, Pune";

  const brandColor = isMasterclass ? "#06b6d4" : "#ef4444";
  const brandBg = isMasterclass ? "#06b6d4" : "#ef4444"; // Use Hex directly for simplicity and robustness
  const brandTextColor = isMasterclass ? "#0891b2" : "#b91c1c";
  const brandAccentBg = isMasterclass ? "#ecfeff" : "#fee2e2";
  const brandBorderColor = isMasterclass ? "#c5f6fa" : "#fecaca";

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

  const handleViewAgenda = () => {
    router.push({
      pathname: "/(attendee)/agenda",
      params: { qrToken: activeToken },
    });
  };

  // ── No token ────────────────────────────────────────────────────────────────
  if (!activeToken) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar barStyle="dark-content" />
        <View
          style={{
            paddingTop: insets.top,
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#fee2e2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Ionicons name="alert-circle" size={40} color="#ef4444" />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "900",
              color: "#0f172a",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Oops!
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            No QR token found. Please log in to view your attendee pass.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#ef4444",
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 15,
                fontWeight: "700",
                marginRight: 8,
              }}
            >
              Back to Login
            </Text>
            <Ionicons name="arrow-back" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar barStyle="dark-content" />
        <View
          style={{
            paddingTop: insets.top,
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color="#64748b" />
          <Text
            style={{
              color: "#64748b",
              fontSize: 14,
              fontWeight: "700",
              marginTop: 16,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Loading your pass...
          </Text>
        </View>
      </View>
    );
  }

  // ── Post-Event Screen ───────────────────────────────────────────────────────
  if (isPostEvent) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 48,
            backgroundColor: "#ffffff",
          }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandColor}
            />
          }
        >
          {/* Hero Section */}
          <View
            style={{
              alignItems: "center",
              marginBottom: 28,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: brandAccentBg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: brandBorderColor,
              }}
            >
              <Ionicons name="ribbon" size={34} color={brandColor} />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: "#0f172a",
                textAlign: "center",
                lineHeight: 30,
              }}
            >
              Thank You for Being Part of{"\n"}
              {eventName}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#64748b",
                textAlign: "center",
                marginTop: 12,
                paddingHorizontal: 16,
                lineHeight: 20,
              }}
            >
              The event may be over, but the memories and connections live on.
              Here is your official attendance certificate.
            </Text>
          </View>

          {/* Certificate View Container */}
          <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
            <CertificateCard
              candidateName={candidate?.name || "Valued Attendee"}
              eventName={eventName}
              eventLocation={eventLocation}
              eventDate={eventDate}
              uniqueId={uniqueId}
              certRef={certificateRef}
            />
          </View>

          {/* Buttons Area */}
          <View style={{ paddingHorizontal: 24 }}>
            {/* Download Button */}
            <TouchableOpacity
              style={{
                backgroundColor: brandColor,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                marginBottom: 16,
                shadowColor: brandColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
                opacity: isDownloading || isSaved ? 0.75 : 1,
              }}
              onPress={handleDownloadCertificate}
              disabled={isDownloading || isSaved}
            >
              {isDownloading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : isSaved ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                style={{ color: "#ffffff", fontSize: 15, fontWeight: "bold" }}
              >
                {isDownloading
                  ? "Downloading..."
                  : isSaved
                    ? "Saved to Gallery!"
                    : "Download Certificate"}
              </Text>
            </TouchableOpacity>

            {/* Quick Link Row Buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                style={{
                  width: "48%",
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 4,
                  elevation: 1,
                }}
                onPress={() => router.push("/(attendee)/gallery")}
              >
                <Ionicons
                  name="images-outline"
                  size={16}
                  color="#64748b"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}
                >
                  Event Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: "48%",
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 4,
                  elevation: 1,
                }}
                onPress={() => router.push("/(attendee)/attendees")}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color="#64748b"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}
                >
                  Connect
                </Text>
              </TouchableOpacity>
            </View>

            {/* Event Highlights Flat Card */}
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: "#f1f5f9",
                marginBottom: 24,
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "900",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 16,
                }}
              >
                Event Highlights
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ width: "48%", marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "900",
                      color: "#0f172a",
                    }}
                  >
                    500+
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: "600",
                    }}
                  >
                    Attendees
                  </Text>
                </View>
                <View style={{ width: "48%", marginBottom: 12 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "900",
                      color: "#0f172a",
                    }}
                  >
                    12
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: "600",
                    }}
                  >
                    Speakers
                  </Text>
                </View>
                <View style={{ width: "48%" }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#334155",
                    }}
                  >
                    AI & Leadership
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: "600",
                    }}
                  >
                    Sessions
                  </Text>
                </View>
                <View style={{ width: "48%" }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#334155",
                    }}
                  >
                    Networking
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontWeight: "600",
                    }}
                  >
                    Experience
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#94a3b8",
              paddingHorizontal: 40,
              lineHeight: 18,
            }}
          >
            Thank you for being part of the ConnectHQ community.
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
        <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
          <StatusBar barStyle="dark-content" />
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 40,
              backgroundColor: "#ffffff",
            }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={brandColor}
              />
            }
          >
            {/* Checked In Celebration Header */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 32,
                paddingHorizontal: 24,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: brandAccentBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: brandBorderColor,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={52}
                  color={brandColor}
                />
              </View>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "900",
                  color: "#0f172a",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                {checkInStatus.isFirstTimeCheckIn ? "Welcome" : "Welcome back"}{" "}
                {checkInStatus.candidateName}!
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#64748b",
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {"You're"} all checked in!
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  textAlign: "center",
                  marginTop: 8,
                  paddingHorizontal: 24,
                  lineHeight: 18,
                }}
              >
                Get ready for an amazing experience at the event. {"We're"} glad
                to have you here.
              </Text>
            </View>

            {/* Quick Actions List Grid */}
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "900",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                Quick Actions
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                {/* Action: Attendees */}
                <TouchableOpacity
                  style={{
                    width: "48%",
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    padding: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "#f1f5f9",
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.02,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  onPress={() => router.push("/(attendee)/attendees")}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: brandAccentBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="people" size={20} color={brandColor} />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#334155",
                    }}
                  >
                    Attendees
                  </Text>
                </TouchableOpacity>

                {/* Action: Agenda */}
                <TouchableOpacity
                  style={{
                    width: "48%",
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    padding: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "#f1f5f9",
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.02,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                  onPress={handleViewAgenda}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: brandAccentBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="calendar" size={20} color={brandColor} />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "bold",
                      color: "#334155",
                    }}
                  >
                    Agenda
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action: Gallery */}
              <TouchableOpacity
                style={{
                  width: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: 20,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                onPress={() => router.push("/(attendee)/gallery")}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: brandAccentBg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="images" size={18} color={brandColor} />
                </View>
                <Text
                  style={{ fontSize: 14, fontWeight: "bold", color: "#334155" }}
                >
                  Event Gallery
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Celebration Badge */}
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <View
                style={{
                  backgroundColor: brandAccentBg,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: brandBorderColor,
                }}
              >
                <Text
                  style={{
                    color: brandTextColor,
                    fontWeight: "900",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
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
        <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
          <StatusBar barStyle="dark-content" />
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 80,
              backgroundColor: "#ffffff",
            }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={brandColor}
              />
            }
          >
            {/* Header Details */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 28,
                paddingHorizontal: 24,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: brandAccentBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: brandBorderColor,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={44}
                  color={brandColor}
                />
              </View>
              <Text
                style={{ fontSize: 26, fontWeight: "900", color: "#0f172a" }}
              >
                {"You're"} Checked In!
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                {checkInStatus.isFirstTimeCheckIn ? "Welcome" : "Welcome back"},{" "}
                {checkInStatus.candidateName}!
              </Text>
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              {/* Check-in Details Flat Card */}
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
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "900",
                    color: brandColor,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  Check-in Details
                </Text>

                {/* Grid */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      Email
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#334155",
                        marginTop: 4,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {checkInStatus.candidateEmail || ""}
                    </Text>
                  </View>

                  <View
                    style={{ width: 1, height: 32, backgroundColor: "#f1f5f9" }}
                  />

                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      Time
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#334155",
                        marginTop: 4,
                      }}
                    >
                      {checkInDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* About Event Card */}
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
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "900",
                    color: brandColor,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 8,
                  }}
                >
                  About Event
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: "#0f172a",
                    marginBottom: 6,
                  }}
                >
                  {eventName}
                </Text>
                <Text
                  style={{ fontSize: 13, color: "#64748b", lineHeight: 20 }}
                >
                  {isMasterclass
                    ? "Unlock Your Leadership Potential! An intensive, high-impact session crafted for visionaries. Learn AI strategies that drive results and connect with the best in the industry."
                    : "The Ultimate Networking Experience! Connect with 500+ industry leaders, discover game-changing insights, and create lasting partnerships. Your next big opportunity awaits!"}
                </Text>
              </View>

              {/* View Agenda CTA */}
              <TouchableOpacity
                style={{
                  backgroundColor: brandColor,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  shadowColor: brandColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                  marginBottom: 24,
                }}
                onPress={handleViewAgenda}
              >
                <Ionicons
                  name="calendar"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: "#ffffff", fontSize: 15, fontWeight: "bold" }}
                >
                  View Agenda
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    // ── Warning (previous day / old check-in) ──
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 40,
            backgroundColor: "#ffffff",
          }}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandColor}
            />
          }
        >
          {/* Header */}
          <View
            style={{
              alignItems: "center",
              marginBottom: 28,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: brandAccentBg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: brandBorderColor,
              }}
            >
              <Ionicons name="ribbon" size={34} color={brandColor} />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: "#0f172a",
                textAlign: "center",
              }}
            >
              Thank You for Attending!
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#64748b",
                textAlign: "center",
                marginTop: 8,
                paddingHorizontal: 24,
                lineHeight: 18,
              }}
            >
              We hope you had a rewarding experience at {eventName}.
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            {/* Badge Details Card */}
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
                shadowOpacity: 0.02,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "900",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                  }}
                >
                  Digital Attendance Badge
                </Text>
                <View
                  style={{
                    backgroundColor: brandAccentBg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: brandBorderColor,
                  }}
                >
                  <Text
                    style={{
                      color: brandColor,
                      fontSize: 9,
                      fontWeight: "900",
                      textTransform: "uppercase",
                    }}
                  >
                    Verified
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#f8fafc",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <Ionicons name="person" size={22} color="#64748b" />
                </View>
                <Text
                  style={{ fontSize: 17, fontWeight: "800", color: "#0f172a" }}
                >
                  {checkInStatus.candidateName}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {checkInStatus.candidateEmail}
                </Text>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: "#f1f5f9",
                  marginBottom: 20,
                }}
              />

              <View
                style={{
                  borderRadius: 12,
                  borderStyle: "solid",
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: "#fafbfc",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#64748b",
                    }}
                  >
                    Event
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#334155",
                    }}
                  >
                    {eventName}
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#64748b",
                    }}
                  >
                    Date
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#334155",
                    }}
                  >
                    {eventDate}
                  </Text>
                </View>
              </View>
            </View>

            {/* CTA Buttons */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: brandColor,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  shadowColor: brandColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={() => {
                  /* Handle Certificate */
                }}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: "#ffffff", fontSize: 15, fontWeight: "bold" }}
                >
                  Download Certificate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 4,
                  elevation: 1,
                }}
                onPress={() => router.push("/(attendee)/gallery")}
              >
                <Ionicons
                  name="images"
                  size={20}
                  color="#64748b"
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: "#334155", fontSize: 15, fontWeight: "bold" }}
                >
                  View Event Gallery
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={{ marginTop: 24, alignItems: "center" }}
            onPress={() => router.replace("/(attendee)/agenda")}
          >
            <Text
              style={{ color: "#94a3b8", fontWeight: "bold", fontSize: 14 }}
            >
              Back to Home
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Default: QR Pass ────────────────────────────────────────────────────────
  return (
    <DefaultPass
      eventName={eventName}
      eventDate={eventDate}
      eventLocation={eventLocation}
      brandBg={brandBg}
      brandText={brandTextColor}
      brandShadow=""
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
