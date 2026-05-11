import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import {
  Candidate,
  CheckInStatusResult,
  getCandidateByEmail,
  getCandidateByQRToken,
  subscribeToCheckInStatus,
} from "../../utils/firestore";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NAVY = "#1a2870";
const GOLD = "#c8a96e";
const GOLD_L = "#e8d5a3"; // lighter gold for subtle accents
const WHITE = "#ffffff";
const SLATE = "#64748b";

// ─── Certificate Styles ───────────────────────────────────────────────────────
const cert = StyleSheet.create({
  // Outer navy frame
  outerFrame: {
    backgroundColor: WHITE,
    borderWidth: 10,
    borderColor: NAVY,
    borderRadius: 6,
    padding: 10,
  },
  // Inner gold border
  innerFrame: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 2,
    paddingVertical: 28,
    paddingHorizontal: 24,
    position: "relative",
    backgroundColor: WHITE,
  },
  // ── Corner bracket helper (shared) ──
  cornerBase: {
    position: "absolute",
    width: 18,
    height: 18,
  },
  cornerEdgeH: {
    position: "absolute",
    height: 2,
    width: 18,
    backgroundColor: GOLD,
  },
  cornerEdgeV: {
    position: "absolute",
    width: 2,
    height: 18,
    backgroundColor: GOLD,
  },
  cornerDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },

  // ── Typography ──
  companyName: {
    fontSize: 9,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  titleText: {
    fontSize: 22,
    fontWeight: "300",
    color: NAVY,
    textAlign: "center",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  certifyLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: GOLD,
    textAlign: "center",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  nameText: {
    fontSize: 30,
    fontStyle: "italic",
    color: NAVY,
    textAlign: "center",
    fontWeight: "400",
    marginBottom: 10,
  },
  goldDivider: {
    height: 1,
    backgroundColor: GOLD,
    marginHorizontal: 32,
    marginBottom: 14,
    opacity: 0.7,
  },
  bodyText: {
    fontSize: 10.5,
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  bodyBold: {
    fontWeight: "700",
    color: NAVY,
  },

  // ── Signature Row ──
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  sigCol: {
    alignItems: "center",
    flex: 1,
  },
  sigName: {
    fontSize: 13,
    fontStyle: "italic",
    color: NAVY,
    marginBottom: 4,
    fontWeight: "400",
  },
  sigLine: {
    height: 0.75,
    backgroundColor: "#bbb",
    width: 76,
    marginBottom: 5,
  },
  sigRole: {
    fontSize: 8,
    color: "#999",
    letterSpacing: 1.2,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // ── Stamp ──
  stampOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  stampInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 0.5,
    borderColor: GOLD_L,
    alignItems: "center",
    justifyContent: "center",
  },
  stampStars: {
    fontSize: 7,
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 1,
  },
  stampWord: {
    fontSize: 8,
    color: GOLD,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  stampYear: {
    fontSize: 11,
    color: GOLD,
    fontWeight: "700",
  },

  // ── Footer ──
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: GOLD_L,
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 8.5,
    color: "#888",
    fontWeight: "600",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
});

// ─── Corner Bracket Component ─────────────────────────────────────────────────
function CornerBracket({ position }: { position: "TL" | "TR" | "BL" | "BR" }) {
  const isTop = position === "TL" || position === "TR";
  const isLeft = position === "TL" || position === "BL";
  const dotStyle = {
    top: isTop ? -3 : undefined,
    bottom: !isTop ? -3 : undefined,
    left: isLeft ? -3 : undefined,
    right: !isLeft ? -3 : undefined,
  };
  const hStyle = {
    top: isTop ? 0 : undefined,
    bottom: !isTop ? 0 : undefined,
    left: isLeft ? 0 : undefined,
    right: !isLeft ? 0 : undefined,
  };
  const vStyle = {
    top: isTop ? 0 : undefined,
    bottom: !isTop ? 0 : undefined,
    left: isLeft ? 0 : undefined,
    right: !isLeft ? 0 : undefined,
  };

  const containerStyle = {
    position: "absolute" as const,
    top: isTop ? -2 : undefined,
    bottom: !isTop ? -2 : undefined,
    left: isLeft ? -2 : undefined,
    right: !isLeft ? -2 : undefined,
    width: 20,
    height: 20,
  };

  return (
    <View style={containerStyle}>
      <View style={[cert.cornerEdgeH, hStyle]} />
      <View style={[cert.cornerEdgeV, vStyle]} />
      <View style={[cert.cornerDot, dotStyle]} />
    </View>
  );
}

// ─── Premium Certificate Card ─────────────────────────────────────────────────
function CertificateCard({
  candidateName,
  eventName,
  eventLocation,
  eventDate,
  uniqueId,
  certRef,
}: {
  candidateName: string;
  eventName: string;
  eventLocation: string;
  eventDate: string;
  uniqueId: string;
  certRef: React.RefObject<any>;
}) {
  return (
    <ViewShot ref={certRef} options={{ format: "png", quality: 1.0 }}>
      <View style={cert.outerFrame}>
        <View style={cert.innerFrame}>
          {/* ── Corner Brackets ── */}
          <CornerBracket position="TL" />
          <CornerBracket position="TR" />
          <CornerBracket position="BL" />
          <CornerBracket position="BR" />

          {/* ── Company Header with Bird Logo ── */}
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Image
                source={{
                  uri: "https://res.cloudinary.com/dcjmaapvi/image/upload/v1730120218/Gryphon_Academy_Bird_Logo_yzzl3q.png",
                }}
                style={{ width: 18, height: 18, resizeMode: "contain" }}
              />
              <Text style={cert.companyName}>Gryphon Academy Pvt Ltd</Text>
            </View>
          </View>

          {/* ── Thin Gold Rule ── */}
          <View
            style={{
              height: 0.5,
              backgroundColor: GOLD_L,
              marginHorizontal: 0,
              marginBottom: 10,
              opacity: 0.8,
            }}
          />

          {/* ── Main Title ── */}
          <Text style={cert.titleText}>Certificate of participation</Text>

          {/* ── Sub Label ── */}
          <Text style={cert.certifyLabel}>This is to certify that</Text>

          {/* ── Recipient Name ── */}
          <Text style={cert.nameText}>{candidateName}</Text>

          {/* ── Gold Divider ── */}
          <View style={cert.goldDivider} />

          {/* ── Body Text ── */}
          <Text style={cert.bodyText}>
            {"demonstrated successful participation and attendance at\n"}
            <Text style={cert.bodyBold}>{eventName}</Text>
            {"\norganized by Gryphon Academy\nat "}
            <Text style={cert.bodyBold}>{eventLocation}</Text>
            {" on "}
            <Text style={cert.bodyBold}>{eventDate}</Text>
          </Text>

          {/* ── Signature Row ── */}
          <View style={cert.sigRow}>
            {/* Founder */}
            <View style={cert.sigCol}>
              <Text style={cert.sigName}>Shashi Bhat</Text>
              <View style={cert.sigLine} />
              <Text style={cert.sigRole}>Founder</Text>
            </View>

            {/* Center Stamp */}
            <View style={[cert.sigCol, { paddingBottom: 2 }]}>
              <View style={cert.stampOuter}>
                <View style={cert.stampInner}>
                  <Text style={cert.stampStars}>★ ★ ★</Text>
                  <Text style={cert.stampWord}>Attended</Text>
                  <Text style={cert.stampYear}>2026</Text>
                </View>
              </View>
            </View>

            {/* Co-Founder */}
            <View style={cert.sigCol}>
              <Text style={cert.sigName}>Umme Ansari</Text>
              <View style={cert.sigLine} />
              <Text style={cert.sigRole}>Co-Founder</Text>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={cert.footerRow}>
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Text
                style={cert.footerText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Certificate ID: {uniqueId}
              </Text>
            </View>
            <Text
              style={{ ...cert.footerText, color: GOLD_L, marginHorizontal: 8 }}
            >
              │
            </Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text
                style={cert.footerText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Issuing Date: {eventDate}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ViewShot>
  );
}

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
        setCandidate(candidateData);
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

  // ── Derived values ──────────────────────────────────────────────────────────
  const isMasterclass =
    candidate?.enrollmentType?.toLowerCase() === "masterclass";
  const eventName = isMasterclass ? "MASTERCLASS 3.0" : "SYNERGY SPHERE 3.0";
  const eventDate = "June 27, 2026";
  const eventLocation = "Ritz-Carlton, Pune";

  const brandColor = isMasterclass ? "#3b82f6" : "#ef4444";
  const brandBg = isMasterclass ? "bg-blue-600" : "bg-red-500";
  const brandShadow = isMasterclass ? "shadow-blue-200" : "shadow-red-200";
  const brandText = isMasterclass ? "text-blue-600" : "text-red-500";
  const brandAccentBg = isMasterclass ? "bg-blue-50" : "bg-red-50";
  const brandAccentText = isMasterclass ? "text-blue-700" : "text-red-700";

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
          >
            <View className="items-center mb-12">
              <View
                className={`w-24 h-24 rounded-full ${brandAccentBg} items-center justify-center mb-6`}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={80}
                  color={brandColor}
                />
              </View>
              <Text className="text-4xl font-bold text-slate-900 text-center mb-2 tracking-tight">
                Welcome {checkInStatus.candidateName?.split(" ")[0]}!
              </Text>
              <Text className="text-xl text-slate-500 font-semibold text-center">
                You're all checked in!
              </Text>
              <Text className="text-base text-slate-400 text-center mt-3 px-4 leading-6">
                Get ready for an amazing experience at the event. We're glad to
                have you here.
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
              paddingBottom: insets.bottom + 40,
              paddingTop: 40,
            }}
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
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
                You're Checked In!
              </Text>
              <Text className="text-base text-slate-500 font-bold text-center mt-1">
                Welcome back, {checkInStatus.candidateName?.split(" ")[0]}!
              </Text>
            </View>

            <View className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200 border border-slate-100 mb-8">
              <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                Check-in Details
              </Text>
              <View className="gap-5">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center mr-4">
                    <Ionicons name="person" size={20} color="#64748b" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">
                      Name
                    </Text>
                    <Text className="text-base font-bold text-slate-800">
                      {checkInStatus.candidateName}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center mr-4">
                    <Ionicons name="mail" size={20} color="#64748b" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">
                      Email
                    </Text>
                    <Text className="text-base font-bold text-slate-800">
                      {checkInStatus.candidateEmail}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-xl ${brandAccentBg} items-center justify-center mr-4`}
                  >
                    <Ionicons name="time" size={20} color={brandColor} />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">
                      Check-in Time
                    </Text>
                    <Text className="text-base font-bold text-slate-800">
                      {checkInDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              className={`${brandBg} rounded-2xl py-4 items-center justify-center flex-row shadow-lg ${brandShadow}`}
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
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Event Banner */}
        <View
          className={`${brandBg}`}
          style={{
            paddingTop: insets.top + 24,
            paddingBottom: 48,
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
                  {candidate?.name || "—"}
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
                  {candidate?.email || "—"}
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
                  {candidate?.enrollmentType || "—"}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-tight">
                  Department
                </Text>
                <Text className="text-base font-bold text-slate-900 capitalize">
                  {candidate?.department || "—"}
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

          {/* CTA */}
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

        <Text className="text-center text-[11px] text-slate-400 mt-6 font-semibold px-10 leading-relaxed">
          Present this QR code at the entrance for check-in. This pass is valid
          for {eventName}.
        </Text>
      </ScrollView>
    </View>
  );
}
