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
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  AppState,
  AppStateStatus,
  StyleSheet,
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationBell from "@/components/qr-pass/NotificationBell";
import NotificationPermissionModal from "@/components/qr-pass/NotificationPermissionModal";
import {
  checkNotificationPermission,
  registerPushTokenForGuestOrUser,
  PermissionStatus,
} from "@/utils/notificationHelper";
import {
  Candidate,
  CheckInStatusResult,
  getCandidateByEmail,
  getCandidateByQRToken,
  getGuestByQRToken,
  subscribeToCheckInStatus,
  getMasterclassAgenda,
  getEventAgenda,
  hasSubmittedFeedback,
  submitEventFeedback,
} from "../../utils/firestore";

// Helper to safely get JS Date from Firebase Timestamp or date representation
const getEventDate = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  if (typeof dateVal.toDate === "function") {
    return dateVal.toDate();
  }
  if (dateVal.seconds !== undefined) {
    return new Date(dateVal.seconds * 1000);
  }
  return new Date(dateVal);
};

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

  // Dynamic Event Date
  const [agendaDate, setAgendaDate] = useState<Date | null>(null);

  // Feedback states
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [formName, setFormName] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formFavorite, setFormFavorite] = useState("");
  const [formInterests, setFormInterests] = useState<string[]>([]);
  const [formExperience, setFormExperience] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (candidate) {
      setFormName(candidate.name || "");
      setFormOrg(candidate.companyName || "");
    }
  }, [candidate]);

  // Notification states
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  const activeToken = resolvedToken || (qrToken as string);
  const qrSize = Math.min(width * 0.5, 220);

  const checkStatus = useCallback(async () => {
    const status = await checkNotificationPermission();
    setPermissionStatus(status);
    if (status === "granted") {
      await registerPushTokenForGuestOrUser(
        candidate?.enrollmentType || "attendee",
        activeToken,
        candidate?.email,
      );
    }
  }, [candidate, activeToken]);

  useEffect(() => {
    checkStatus();
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkStatus();
        }
      },
    );
    return () => {
      subscription.remove();
    };
  }, [checkStatus]);

  const handlePermissionUpdated = (
    status: PermissionStatus,
    toastMsg: string,
  ) => {
    setPermissionStatus(status);
    setToastType(status === "granted" ? "success" : "warning");
    setToastMessage(toastMsg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

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

        // Check feedback submission status
        if (candidateData) {
          try {
            const localCheck = await AsyncStorage.getItem(`feedback_submitted_${candidateData.id}`);
            if (localCheck === "true") {
              setFeedbackSubmitted(true);
            } else {
              const firestoreCheck = await hasSubmittedFeedback(candidateData.id);
              if (firestoreCheck) {
                setFeedbackSubmitted(true);
                await AsyncStorage.setItem(`feedback_submitted_${candidateData.id}`, "true");
              }
            }
          } catch (e) {
            console.error("Error checking feedback status:", e);
          }
        }
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

  useEffect(() => {
    const fetchEventDate = async () => {
      if (!candidate?.enrollmentType) return;
      try {
        const isM = candidate.enrollmentType.toLowerCase() === "masterclass";
        const agenda = isM ? await getMasterclassAgenda() : await getEventAgenda();
        if (agenda?.date) {
          const dateVal = getEventDate(agenda.date);
          setAgendaDate(dateVal);
        }
      } catch (error) {
        console.error("Error fetching agenda date:", error);
      }
    };
    fetchEventDate();
  }, [candidate?.enrollmentType]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const isMasterclass =
    candidate?.enrollmentType?.toLowerCase() === "masterclass";
  const eventName = isMasterclass
    ? "Gryphon Academy's\nMasterclass 3.0"
    : "Gryphon Academy's\nSynergy Sphere 2.0";
  
  const displayEventDate = agendaDate
    ? agendaDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "June 27, 2026";
  const eventDate = displayEventDate;
  const eventLocation = "Ritz-Carlton, Pune";

  const brandColor = isMasterclass ? "#06b6d4" : "#ef4444";
  const brandBg = isMasterclass ? "#06b6d4" : "#ef4444"; // Use Hex directly for simplicity and robustness
  const brandTextColor = isMasterclass ? "#0891b2" : "#b91c1c";
  const brandAccentBg = isMasterclass ? "#ecfeff" : "#fee2e2";
  const brandBorderColor = isMasterclass ? "#c5f6fa" : "#fecaca";

  const uniqueId = candidate?.qrToken
    ? `EVNT-2025-${candidate.qrToken.substring(0, 4).toUpperCase()}`
    : "EVNT-2025-XXXX";

  const eventDateTime = agendaDate ? new Date(agendaDate) : new Date("2026-06-27");
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
      let hasPermission = false;
      if (Platform.OS === "android" && Number(Platform.Version) >= 29) {
        hasPermission = true;
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        hasPermission = status === "granted";
      }

      if (!hasPermission) {
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

  if (isPostEvent) {
    if (!feedbackSubmitted && !isMasterclass) {
      const q3Options = [
        "The Keynote Addresses",
        "The Panel Discussion — The Adventurous Intelligence: Deficit or Dominance?",
        "The Networking & Conversations",
        "The Awards Ceremony",
        "The Overall Experience & Hospitality",
      ];

      const q4Options = [
        "Professor of Practice (POP) for our Esteemed Academic Partners",
        "Guest Lecturer",
        "Board of Advisor",
        "Mentorship for Students",
        "Campus Hiring Industry Board",
        "Domain-Specific Training",
        "Training Content Co-Creation",
        "Niche Skills Training (SAP, Project Management, Product Management, etc.)",
        "None of the above, but happy to stay connected",
      ];

      const experienceSuggestions = ["Insightful", "Inspiring", "Innovative", "Engaging", "Well-Organized"];

      const toggleInterest = (interest: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (interest === "None of the above, but happy to stay connected") {
          setFormInterests([interest]);
        } else {
          setFormInterests((prev) => {
            const filtered = prev.filter(
              (item) => item !== "None of the above, but happy to stay connected"
            );
            if (filtered.includes(interest)) {
              return filtered.filter((item) => item !== interest);
            } else {
              return [...filtered, interest];
            }
          });
        }
      };

      const selectFavorite = (option: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFormFavorite(option);
      };

      const appendExperienceWord = (word: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFormExperience((prev) => {
          const trimmed = prev.trim();
          if (!trimmed) return word;
          if (trimmed.toLowerCase().includes(word.toLowerCase())) return prev;
          return `${trimmed}, ${word}`;
        });
      };

      const handleFormSubmit = async () => {
        const errors: Record<string, string> = {};
        if (!formName.trim()) errors.name = "Name is required";
        if (!formOrg.trim()) errors.organisation = "Organisation is required";
        if (!formFavorite) errors.favoritePart = "Please select an option";
        if (formInterests.length === 0) errors.interests = "Please select at least one option";
        if (!formExperience.trim()) errors.experienceWords = "Feedback is required";

        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setToastType("warning");
          setToastMessage("Please fill in all required fields.");
          setTimeout(() => setToastMessage(""), 4000);
          return;
        }

        setFormErrors({});
        setSubmittingFeedback(true);

        try {
          const res = await submitEventFeedback({
            candidateId: candidate?.id || activeToken,
            name: formName.trim(),
            organisation: formOrg.trim(),
            favoritePart: formFavorite,
            interests: formInterests,
            experienceWords: formExperience.trim(),
            submittedAt: new Date(),
          });

          if (res.success) {
            await AsyncStorage.setItem(`feedback_submitted_${candidate?.id || activeToken}`, "true");
            setFeedbackSubmitted(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastType("success");
            setToastMessage("Thank you for your feedback!");
            setTimeout(() => setToastMessage(""), 4000);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setToastType("warning");
            setToastMessage(res.message || "Failed to submit feedback. Please try again.");
            setTimeout(() => setToastMessage(""), 4000);
          }
        } catch (err: any) {
          console.error("Error submitting feedback:", err);
          setToastType("warning");
          setToastMessage("An error occurred. Please try again.");
          setTimeout(() => setToastMessage(""), 4000);
        } finally {
          setSubmittingFeedback(false);
        }
      };

      return (
        <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
          <StatusBar barStyle="dark-content" />
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 120,
              paddingHorizontal: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header section */}
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: brandAccentBg,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  borderWidth: 1.5,
                  borderColor: brandBorderColor,
                }}
              >
                <Ionicons name="chatbubbles" size={24} color={brandColor} />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "900",
                  color: "#0f172a",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Synergy Sphere 2.0
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#475569",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                Post-Event Experience & Engagement Form
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  textAlign: "center",
                  lineHeight: 20,
                  paddingHorizontal: 12,
                }}
              >
                Thank you for being a part of Synergy Sphere 2.0 — The Adventurous Intelligence. Your presence made the evening meaningful, and we would love to hear your thoughts. This short form takes less than 2 minutes.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={{ gap: 20 }}>
              {/* Q1. Name */}
              <View>
                <Text style={styles.formLabel}>Q1. Name</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    formErrors.name ? { borderColor: "#ef4444" } : null,
                  ]}
                  placeholder="Enter your name"
                  placeholderTextColor="#94a3b8"
                  value={formName}
                  onChangeText={(val) => {
                    setFormName(val);
                    if (val.trim()) {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.name;
                        return copy;
                      });
                    }
                  }}
                />
                {formErrors.name ? (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                ) : null}
              </View>

              {/* Q2. Organisation */}
              <View>
                <Text style={styles.formLabel}>Q2. Organisation</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    formErrors.organisation ? { borderColor: "#ef4444" } : null,
                  ]}
                  placeholder="Enter your organisation"
                  placeholderTextColor="#94a3b8"
                  value={formOrg}
                  onChangeText={(val) => {
                    setFormOrg(val);
                    if (val.trim()) {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.organisation;
                        return copy;
                      });
                    }
                  }}
                />
                {formErrors.organisation ? (
                  <Text style={styles.errorText}>{formErrors.organisation}</Text>
                ) : null}
              </View>

              {/* Q3. Favorite part of the evening */}
              <View>
                <Text style={styles.formLabel}>
                  Q3. Which part of the evening resonated with you the most?
                </Text>
                <View style={{ gap: 10, marginTop: 4 }}>
                  {q3Options.map((option) => {
                    const isSelected = formFavorite === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionCard,
                          isSelected
                            ? {
                                borderColor: brandColor,
                                backgroundColor: brandAccentBg,
                              }
                            : null,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          selectFavorite(option);
                          setFormErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.favoritePart;
                            return copy;
                          });
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text
                            style={[
                              styles.optionText,
                              isSelected ? { color: brandTextColor, fontWeight: "700" } : null,
                            ]}
                          >
                            {option}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected ? { borderColor: brandColor, backgroundColor: brandColor } : null,
                          ]}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark" size={12} color="#ffffff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {formErrors.favoritePart ? (
                  <Text style={styles.errorText}>{formErrors.favoritePart}</Text>
                ) : null}
              </View>

              {/* Q4. Engagement Interests */}
              <View>
                <Text style={styles.formLabel}>
                  Q4. Which of the following would you be interested in exploring with us? (Select all that apply)
                </Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {q4Options.map((option) => {
                    const isSelected = formInterests.includes(option);
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionCard,
                          isSelected
                            ? {
                                borderColor: brandColor,
                                backgroundColor: brandAccentBg,
                              }
                            : null,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          toggleInterest(option);
                          setFormErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.interests;
                            return copy;
                          });
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text
                            style={[
                              styles.optionText,
                              isSelected ? { color: brandTextColor, fontWeight: "700" } : null,
                            ]}
                          >
                            {option}
                          </Text>
                        </View>
                        <View
                          style={[
                            {
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              borderWidth: 2,
                              borderColor: "#cbd5e1",
                              alignItems: "center",
                              justifyContent: "center",
                            },
                            isSelected ? { borderColor: brandColor, backgroundColor: brandColor } : null,
                          ]}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark" size={12} color="#ffffff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {formErrors.interests ? (
                  <Text style={styles.errorText}>{formErrors.interests}</Text>
                ) : null}
              </View>

              {/* Q5. Words to describe experience */}
              <View>
                <Text style={styles.formLabel}>
                  Q5. What words would you use to describe your experience of the event?
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { height: 80, textAlignVertical: "top", paddingTop: 10 },
                    formErrors.experienceWords ? { borderColor: "#ef4444" } : null,
                  ]}
                  placeholder="e.g. Inspiring and excellently executed event"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  value={formExperience}
                  onChangeText={(val) => {
                    setFormExperience(val);
                    if (val.trim()) {
                      setFormErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.experienceWords;
                        return copy;
                      });
                    }
                  }}
                />
                
                {/* Word Suggestions */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {experienceSuggestions.map((word) => (
                    <TouchableOpacity
                      key={word}
                      style={styles.suggestionBadge}
                      onPress={() => appendExperienceWord(word)}
                    >
                      <Text style={styles.suggestionText}>+ {word}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {formErrors.experienceWords ? (
                  <Text style={styles.errorText}>{formErrors.experienceWords}</Text>
                ) : null}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: brandColor },
                  submittingFeedback ? { opacity: 0.8 } : null,
                ]}
                activeOpacity={0.8}
                onPress={handleFormSubmit}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Closing note */}
            <View style={{ marginTop: 36, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                Thank you once again for being part of Synergy Sphere 2.0. We look forward to staying in touch.{"\n\n"}
                <Text style={{ fontWeight: "700" }}>Gryphon Academy Pvt. Ltd.</Text>
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#ffffff",
            paddingHorizontal: 28,
            paddingTop: 48,
            paddingBottom: insets.bottom + 100,
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
          {/* Ribbon Icon */}
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: brandAccentBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              borderWidth: 1.5,
              borderColor: brandBorderColor,
              shadowColor: brandColor,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <Ionicons name="ribbon" size={44} color={brandColor} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: "900",
              color: "#0f172a",
              textAlign: "center",
              lineHeight: 34,
              marginBottom: 14,
            }}
          >
            Thank You for Being{"\n"}Part of {eventName}
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 40,
              paddingHorizontal: 8,
            }}
          >
            The event may be over, but the memories and connections live on.
            Check out the gallery or stay connected with other attendees.
          </Text>

          {/* Full-width stacked buttons */}
          <View style={{ width: "100%", gap: 14 }}>
            <TouchableOpacity
              style={{
                backgroundColor: brandColor,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                shadowColor: brandColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => router.push("/(attendee)/gallery")}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color="#ffffff"
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#ffffff",
                  letterSpacing: 0.3,
                }}
              >
                View Event Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                borderWidth: 1.5,
                borderColor: brandBorderColor,
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => router.push("/(attendee)/attendees")}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={brandColor}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: brandColor,
                  letterSpacing: 0.3,
                }}
              >
                Connect with Attendees
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#94a3b8",
              paddingHorizontal: 32,
              lineHeight: 18,
              marginTop: 40,
            }}
          >
            Thank you for being part of the Gryphon Academy community. 🎓
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
            {/* Top row with Notification Bell */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 24, marginTop: 10 }}>
              <NotificationBell
                permissionStatus={permissionStatus}
                onPress={() => setModalVisible(true)}
                themeColor={brandColor}
                themeSoftBg={brandAccentBg}
                themeBorderColor={brandBorderColor}
              />
            </View>

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

          {/* Notification permission sheet */}
          <NotificationPermissionModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            permissionStatus={permissionStatus}
            onPermissionUpdated={handlePermissionUpdated}
            enrollmentType={candidate?.enrollmentType || "attendee"}
            qrToken={activeToken}
            email={candidate?.email}
          />

          {/* Custom feedback toast overlay */}
          {toastMessage ? (
            <View style={styles.toastContainer}>
              <Ionicons
                name={toastType === "success" ? "checkmark-circle" : "alert-circle"}
                size={20}
                color={toastType === "success" ? "#10B981" : "#EF4444"}
              />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          ) : null}
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
            {/* Top row with Notification Bell */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 24, marginTop: 10 }}>
              <NotificationBell
                permissionStatus={permissionStatus}
                onPress={() => setModalVisible(true)}
                themeColor={brandColor}
                themeSoftBg={brandAccentBg}
                themeBorderColor={brandBorderColor}
              />
            </View>

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
                    ? "A flagship, invite-only gathering exclusively for academicians, trainers, educators, deans, principals, and institutional leaders from across India. With our theme centred on Adventurous Intelligence, this event creates meaningful dialogue among the minds shaping India's educational future — bridging the gap between industry and academia for the benefit of students."
                    : "A flagship industry and academia confluence. An exclusive space where industry brilliance and policy leadership meet — deliberating on emerging technological trends and the evolving industry-academia blueprint. An evening of impactful discussions and high-level networking."}
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

          {/* Notification permission sheet */}
          <NotificationPermissionModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            permissionStatus={permissionStatus}
            onPermissionUpdated={handlePermissionUpdated}
            enrollmentType={candidate?.enrollmentType || "attendee"}
            qrToken={activeToken}
            email={candidate?.email}
          />

          {/* Custom feedback toast overlay */}
          {toastMessage ? (
            <View style={styles.toastContainer}>
              <Ionicons
                name={toastType === "success" ? "checkmark-circle" : "alert-circle"}
                size={20}
                color={toastType === "success" ? "#10B981" : "#EF4444"}
              />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          ) : null}
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
          {/* Top row with Notification Bell */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 24, marginTop: 10 }}>
            <NotificationBell
              permissionStatus={permissionStatus}
              onPress={() => setModalVisible(true)}
              themeColor={brandColor}
              themeSoftBg={brandAccentBg}
              themeBorderColor={brandBorderColor}
            />
          </View>

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

        {/* Notification permission sheet */}
        <NotificationPermissionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          permissionStatus={permissionStatus}
          onPermissionUpdated={handlePermissionUpdated}
          enrollmentType={candidate?.enrollmentType || "attendee"}
          qrToken={activeToken}
          email={candidate?.email}
        />

        {/* Custom feedback toast overlay */}
        {toastMessage ? (
          <View style={styles.toastContainer}>
            <Ionicons
              name={toastType === "success" ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={toastType === "success" ? "#10B981" : "#EF4444"}
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}
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

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 100, // Make sure it sits above the bottom tab bar
    alignSelf: "center",
    backgroundColor: "#1E293B",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  formInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 20,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  pillChip: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  suggestionBadge: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  suggestionText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
