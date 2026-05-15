import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { getEnrollmentDisplayName } from "@/hooks/use-attendee-theme";
import {
  addGuest,
  deleteGuest,
  getCheckedInCandidateIds,
  getGuestList,
  GuestListItem,
  updateGuest,
  validateAndCheckIn,
} from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Papa from "papaparse";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type WebAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "cancel" | "default" | "destructive";
};

const showAlert = (
  title: string,
  message: string,
  buttons?: WebAlertButton[],
) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (!buttons || buttons.length <= 1) {
      window.alert(`${title}\n\n${message}`);
      if (buttons?.[0]?.onPress) buttons[0].onPress();
      return;
    }

    const cancelButton = buttons.find((button) => button.style === "cancel");
    const primaryButton =
      buttons.find((button) => button.style !== "cancel") ?? buttons[0];
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) primaryButton?.onPress?.();
    else cancelButton?.onPress?.();
    return;
  }

  Alert.alert(title, message, buttons);
};

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  "#F44336",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
  "#03A9F4",
  "#00BCD4",
  "#009688",
  "#4CAF50",
  "#8BC34A",
  "#FFC107",
  "#FF9800",
  "#FF5722",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

type GuestStatus = "arrived" | "unarrived" | "pending";

type FilterStatus = "all" | GuestStatus;

export default function GuestListScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const canEdit = role === "superadmin";

  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isVIP, setIsVIP] = useState(false);
  const [enrollmentType, setEnrollmentType] = useState<"masterclass" | "event">(
    "event",
  );
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // CSV Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "parsing" | "uploading" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadResults, setUploadResults] = useState<{
    successCount: number;
    failureCount: number;
    total: number;
  }>({ successCount: 0, failureCount: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState<
    { row: number; name: string; email: string; error: string }[]
  >([]);

  const loadGuests = useCallback(async () => {
    setLoading(true);
    const [guestList, checkIns] = await Promise.all([
      getGuestList(),
      getCheckedInCandidateIds(),
    ]);
    setGuests(guestList);
    setCheckedInIds(new Set(checkIns));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGuests();
    setRefreshing(false);
  }, [loadGuests]);

  const handleCheckIn = async (guest: GuestListItem) => {
    const targetEventId = "test-event";
    if (!guest.qrToken) {
      showAlert("Error", "Guest has no QR token.");
      return;
    }
    setLoading(true);
    try {
      // Clear old checked in time (delete existing attendance records)
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("candidateId", "==", guest.id),
        where("eventId", "==", targetEventId),
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const deletePromises = attendanceSnap.docs.map((doc) =>
        deleteDoc(doc.ref),
      );
      await Promise.all(deletePromises);

      // Set new as current (check in again)
      const result = await validateAndCheckIn(
        guest.qrToken,
        targetEventId,
        "admin",
      );
      showAlert("Result", result.message);
      if (result.success) {
        loadGuests(); // Reload to update status
      }
    } catch (error: any) {
      showAlert("Error", error.message || "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async () => {
    if (!name.trim() || !email.trim()) {
      showAlert("Error", "Please fill in all fields");
      return;
    }
    setSubmitting(true);

    let result;
    if (editingId) {
      result = await updateGuest(editingId, {
        name,
        email,
        enrollmentType,
        linkedinUrl,
        companyName,
        isVIP,
      });
    } else {
      result = await addGuest(name, email, enrollmentType, linkedinUrl, companyName, isVIP);
    }

    showAlert("Result", result.message);
    if (result.success) {
      resetForm();
      loadGuests();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setLinkedinUrl("");
    setCompanyName("");
    setIsVIP(false);
    setEnrollmentType("event");
    setShowForm(false);
    setShowEditModal(false);
    setEditingId(null);
  };

  const handleEditGuest = (guest: GuestListItem) => {
    setName(guest.name);
    setEmail(guest.email);
    setEnrollmentType(guest.enrollmentType);
    setLinkedinUrl(guest.linkedinUrl || "");
    setCompanyName(guest.companyName || "");
    setIsVIP(guest.isVIP || false);
    setEditingId(guest.id);
    setShowEditModal(true);
  };

  const handleDeleteGuest = (id: string) => {
    showAlert("Delete Guest", "Are you sure you want to delete this guest?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          const result = await deleteGuest(id);
          if (result.success) {
            loadGuests();
          } else {
            setLoading(false);
            showAlert("Error", result.message);
          }
        },
      },
    ]);
  };

  const resetUploadModal = () => {
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadFileName("");
    setUploadResults({ successCount: 0, failureCount: 0, total: 0 });
    setUploadErrors([]);
  };

  const handleDownloadTemplate = async () => {
    const csvContent =
      "name,email,enrollmentType,company,linkedinUrl,vip\nJohn Doe,john@example.com,event,Google,https://linkedin.com/in/johndoe,true\nJane Smith,jane@example.com,masterclass,Microsoft,,false";
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "guest_template.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}guest_template.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        const { default: Sharing } = await import("expo-sharing");
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/csv" });
        } else {
          showAlert("Saved", `Template saved to: ${fileUri}`);
        }
      }
    } catch (e) {
      showAlert("Error", "Could not download template");
    }
  };

  const uploadValidGuestsWithProgress = async (
    guestsToUpload: {
      name: string;
      email: string;
      enrollmentType: "masterclass" | "event";
      linkedinUrl?: string;
      company?: string;
      isVIP?: boolean;
    }[],
  ) => {
    setUploadStatus("uploading");
    setUploadProgress(0);
    let successCount = 0;
    let failureCount = 0;
    const failures: {
      row: number;
      name: string;
      email: string;
      error: string;
    }[] = [];

    for (let i = 0; i < guestsToUpload.length; i++) {
      const guest = guestsToUpload[i];
      try {
        const result = await addGuest(
          guest.name,
          guest.email,
          guest.enrollmentType,
          guest.linkedinUrl,
          guest.company,
          guest.isVIP,
        );
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          failures.push({
            row: i + 2,
            name: guest.name,
            email: guest.email,
            error: result.message,
          });
        }
      } catch (error: any) {
        failureCount++;
        failures.push({
          row: i + 2,
          name: guest.name,
          email: guest.email,
          error: error.message || "Unknown error",
        });
      }
      setUploadProgress(Math.round(((i + 1) / guestsToUpload.length) * 100));
      if (i < guestsToUpload.length - 1)
        await new Promise((r) => setTimeout(r, 80));
    }

    setUploadResults({
      successCount,
      failureCount,
      total: guestsToUpload.length,
    });
    if (failures.length > 0) setUploadErrors(failures);
    setUploadStatus(failureCount === 0 ? "success" : "error");
    loadGuests();
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.ms-excel"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fileName = asset.name;
      const fileUri = asset.uri;
      const ext = fileName.split(".").pop()?.toLowerCase();

      if (ext !== "csv") {
        setUploadErrors([
          { row: 0, name: "", email: "", error: "Please upload a .csv file" },
        ]);
        setUploadStatus("error");
        return;
      }

      setUploadFileName(fileName);
      setUploadStatus("parsing");

      let fileContent = "";
      const webFile = "file" in asset ? (asset.file as File | null) : null;
      const looksLikeWebUri =
        fileUri.startsWith("blob:") ||
        fileUri.startsWith("data:") ||
        fileUri.startsWith("http");

      if (webFile) {
        fileContent = await webFile.text();
      } else if (Platform.OS === "web" || looksLikeWebUri) {
        const response = await fetch(fileUri);
        fileContent = await response.text();
      } else {
        fileContent = await FileSystem.readAsStringAsync(fileUri);
      }

      const parseResult = Papa.parse(fileContent, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
      });

      if (parseResult.errors.length > 0) {
        setUploadErrors([
          {
            row: 0,
            name: "",
            email: "",
            error: "Invalid CSV format. Check the file structure.",
          },
        ]);
        setUploadStatus("error");
        return;
      }

      const validGuests: {
        name: string;
        email: string;
        enrollmentType: "masterclass" | "event";
        linkedinUrl?: string;
        company?: string;
        isVIP?: boolean;
      }[] = [];
      const errors: {
        row: number;
        name: string;
        email: string;
        error: string;
      }[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const dataRows = parseResult.data as any[];

      dataRows.forEach((row, index) => {
        const rowNumber = index + 2;
        const name = row.name?.trim();
        const email = row.email?.trim();
        let enrollmentType = row.enrollmentType?.trim().toLowerCase();
        const linkedinUrl = row.linkedinUrl?.trim() || "";
        const company = row.company?.trim() || "";
        const vip = row.vip?.trim().toLowerCase() === "true";

        if (!name) {
          errors.push({
            row: rowNumber,
            name: "Missing",
            email: email || "Missing",
            error: "Name is required",
          });
          return;
        }
        if (!email) {
          errors.push({
            row: rowNumber,
            name,
            email: "Missing",
            error: "Email is required",
          });
          return;
        }
        if (!emailRegex.test(email)) {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: "Invalid email format",
          });
          return;
        }
        if (!enrollmentType) {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: "Enrollment type is required",
          });
          return;
        }
        if (enrollmentType !== "masterclass" && enrollmentType !== "event") {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: 'Must be "masterclass" or "event"',
          });
          return;
        }
        const isDupe = validGuests.some(
          (g) => g.email.toLowerCase() === email.toLowerCase(),
        );
        if (isDupe) {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: "Duplicate email in file",
          });
          return;
        }
        const existsInDb = guests.find(
          (g) => g.email.toLowerCase() === email.toLowerCase(),
        );
        if (existsInDb) {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: `Already exists (${existsInDb.name})`,
          });
          return;
        }

        validGuests.push({
          name,
          email: email.toLowerCase(),
          enrollmentType: enrollmentType as "masterclass" | "event",
          linkedinUrl: linkedinUrl || undefined,
          company: company || undefined,
          isVIP: vip,
        });
      });

      if (errors.length > 0 && validGuests.length === 0) {
        setUploadErrors(errors);
        setUploadStatus("error");
        setUploadResults({
          successCount: 0,
          failureCount: errors.length,
          total: errors.length,
        });
        return;
      }

      if (errors.length > 0) {
        setUploadErrors(errors);
      }

      if (validGuests.length > 0) {
        await uploadValidGuestsWithProgress(validGuests);
      } else {
        setUploadErrors([
          { row: 0, name: "", email: "", error: "No valid entries found" },
        ]);
        setUploadStatus("error");
      }
    } catch (error: any) {
      setUploadErrors([
        {
          row: 0,
          name: "",
          email: "",
          error: error?.message || "Upload failed",
        },
      ]);
      setUploadStatus("error");
    }
  };

  const getGuestStatus = (
    guest: GuestListItem,
    currentCheckedInIds: Set<string>,
  ): GuestStatus => {
    if (guest.status === "registered") {
      return currentCheckedInIds.has(guest.id) ? "arrived" : "unarrived";
    }
    return "pending";
  };

  const filteredGuests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(normalizedQuery) ||
        guest.email.toLowerCase().includes(normalizedQuery);
      if (!matchesSearch) return false;

      if (filterStatus === "all") return true;
      return getGuestStatus(guest, checkedInIds) === filterStatus;
    });
  }, [guests, searchQuery, filterStatus, checkedInIds]);

  const arrivedCount = guests.filter(
    (guest) => getGuestStatus(guest, checkedInIds) === "arrived",
  ).length;
  const unarrivedCount = guests.filter(
    (guest) => getGuestStatus(guest, checkedInIds) === "unarrived",
  ).length;
  const pendingCount = guests.filter(
    (guest) => getGuestStatus(guest, checkedInIds) === "pending",
  ).length;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Guest List</Text>
          <Text style={styles.headerSubtitle}>ADMIN • INNOVATESUMMIT</Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            <Ionicons
              name={showForm ? "close" : "add"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{guests.length}</Text>
          <Text style={styles.statLabel}>Total guests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberGreen]}>
            {arrivedCount}
          </Text>
          <Text style={[styles.statLabel, styles.statLabelGreen]}>Arrived</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberOrange]}>
            {unarrivedCount}
          </Text>
          <Text style={[styles.statLabel, styles.statLabelOrange]}>
            Unarrived
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberBlue]}>
            {pendingCount}
          </Text>
          <Text style={[styles.statLabel, styles.statLabelBlue]}>Pending</Text>
        </View>
      </View>

      {/* Radio Button Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterOption,
            filterStatus === "all" && styles.filterOptionActive,
          ]}
          onPress={() => setFilterStatus("all")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.radioCircle,
              filterStatus === "all" && styles.radioCircleActive,
            ]}
          >
            {filterStatus === "all" && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.filterText,
              filterStatus === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterOption,
            filterStatus === "arrived" && styles.filterOptionActive,
          ]}
          onPress={() => setFilterStatus("arrived")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.radioCircle,
              filterStatus === "arrived" && styles.radioCircleActive,
            ]}
          >
            {filterStatus === "arrived" && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.filterText,
              filterStatus === "arrived" && styles.filterTextActive,
            ]}
          >
            Arrived
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterOption,
            filterStatus === "unarrived" && styles.filterOptionActive,
          ]}
          onPress={() => setFilterStatus("unarrived")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.radioCircle,
              filterStatus === "unarrived" && styles.radioCircleActive,
            ]}
          >
            {filterStatus === "unarrived" && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.filterText,
              filterStatus === "unarrived" && styles.filterTextActive,
            ]}
          >
            Unarrived
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterOption,
            filterStatus === "pending" && styles.filterOptionActive,
          ]}
          onPress={() => setFilterStatus("pending")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.radioCircle,
              filterStatus === "pending" && styles.radioCircleActive,
            ]}
          >
            {filterStatus === "pending" && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.filterText,
              filterStatus === "pending" && styles.filterTextActive,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add Guest Form (Inline) */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Guest</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              editable={!submitting}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Email Address"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
            <TextInput
              style={styles.formInput}
              placeholder="LinkedIn URL (Optional)"
              placeholderTextColor="#9ca3af"
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              autoCapitalize="none"
              editable={!submitting}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Company Name"
              placeholderTextColor="#9ca3af"
              value={companyName}
              onChangeText={setCompanyName}
              editable={!submitting}
            />
            <Text style={styles.fieldLabel}>ENROLLMENT TYPE</Text>
            <View style={styles.enrollmentRow}>
              {["masterclass", "event"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.enrollmentBtn,
                    enrollmentType === type && styles.enrollmentBtnActive,
                  ]}
                  onPress={() =>
                    setEnrollmentType(type as "masterclass" | "event")
                  }
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.enrollmentBtnText,
                      enrollmentType === type && styles.enrollmentBtnTextActive,
                    ]}
                  >
                    {getEnrollmentDisplayName(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 4 }}>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                onPress={() => setIsVIP(!isVIP)}
                disabled={submitting}
              >
                <View
                  style={[
                    styles.radioCircle,
                    isVIP && styles.radioCircleActive,
                  ]}
                >
                  {isVIP && <View style={styles.radioInner} />}
                </View>
                <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>Mark as VIP</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleAddGuest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Guest</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Upload CSV Card */}
        {canEdit && (
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => {
              resetUploadModal();
              setShowUploadModal(true);
            }}
          >
            <View style={styles.uploadContent}>
              <View style={styles.uploadIconBg}>
                <Ionicons name="cloud-upload" size={22} color="#000000" />
              </View>
              <View style={styles.uploadTextBlock}>
                <Text style={styles.uploadTitle}>Upload CSV file</Text>
                <Text style={styles.uploadSubtitle}>
                  name, email, enrollmentType, company, linkedinUrl
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}

        {/* Section Header with active filter display */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filterStatus === "all"
              ? "ALL GUESTS"
              : filterStatus === "arrived"
                ? "ARRIVED GUESTS"
                : filterStatus === "unarrived"
                  ? "UNARRIVED GUESTS"
                  : "PENDING GUESTS"}
          </Text>
          <Text style={styles.sectionCount}>{filteredGuests.length}</Text>
        </View>

        {/* Guest List */}
        <View style={styles.listContainer}>
          {filteredGuests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No guests found"
                  : `No ${filterStatus === "all" ? "" : filterStatus} guests`}
              </Text>
            </View>
          ) : (
            filteredGuests.map((item) => {
              const status = getGuestStatus(item, checkedInIds);
              return (
                <View key={item.id} style={styles.guestItem}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getAvatarColor(item.name) },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View style={styles.guestInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.guestName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isVIP && (
                        <View style={{ backgroundColor: "#f59e0b", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>VIP</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.guestEmail} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      status === "arrived"
                        ? styles.statusArrived
                        : status === "unarrived"
                          ? styles.statusUnarrived
                          : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        status === "arrived"
                          ? styles.statusTextArrived
                          : status === "unarrived"
                            ? styles.statusTextUnarrived
                            : styles.statusTextPending,
                      ]}
                    >
                      {status === "arrived"
                        ? "Arrived"
                        : status === "unarrived"
                          ? "Unarrived"
                          : "Pending"}
                    </Text>
                  </View>

                  {canEdit && (
                    <View style={styles.actionButtons}>
                      {(status === "unarrived" || status === "arrived") && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.checkInBtn]}
                          onPress={() => handleCheckIn(item)}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10b981"
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => handleEditGuest(item)}
                      >
                        <Ionicons name="pencil" size={16} color="#000000" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteGuest(item.id)}
                      >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      {/* Edit Guest Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Guest</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
              editable={!submitting}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Email Address"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="LinkedIn URL (Optional)"
              placeholderTextColor="#64748b"
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              autoCapitalize="none"
              editable={!submitting}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Company Name"
              placeholderTextColor="#64748b"
              value={companyName}
              onChangeText={setCompanyName}
              editable={!submitting}
            />

            <Text style={styles.modalFieldLabel}>ENROLLMENT TYPE</Text>
            <View style={styles.modalEnrollmentRow}>
              {["masterclass", "event"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modalEnrollmentBtn,
                    enrollmentType === type && styles.modalEnrollmentBtnActive,
                  ]}
                  onPress={() =>
                    setEnrollmentType(type as "masterclass" | "event")
                  }
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.modalEnrollmentBtnText,
                      enrollmentType === type &&
                        styles.modalEnrollmentBtnTextActive,
                    ]}
                  >
                    {getEnrollmentDisplayName(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 4 }}>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                onPress={() => setIsVIP(!isVIP)}
                disabled={submitting}
              >
                <View
                  style={[
                    styles.radioCircle,
                    isVIP && styles.radioCircleActive,
                  ]}
                >
                  {isVIP && <View style={styles.radioInner} />}
                </View>
                <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>Mark as VIP</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalUpdateButton,
                  submitting && styles.modalUpdateButtonDisabled,
                ]}
                onPress={handleAddGuest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalUpdateButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (uploadStatus !== "uploading") {
            setShowUploadModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 420 }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {uploadStatus === "success"
                  ? "Upload Complete"
                  : uploadStatus === "error"
                    ? "Upload Results"
                    : "Import Guests"}
              </Text>
              {uploadStatus !== "uploading" && (
                <TouchableOpacity
                  onPress={() => setShowUploadModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Idle State */}
            {uploadStatus === "idle" && (
              <View>
                {/* Template Download */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F0FDF4",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: "#BBF7D0",
                  }}
                  onPress={handleDownloadTemplate}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: "#DCFCE7",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color="#16A34A"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#15803D",
                      }}
                    >
                      Download Template
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: "#4ADE80", marginTop: 1 }}
                    >
                      name, email, enrollmentType, company, linkedinUrl
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#86EFAC" />
                </TouchableOpacity>

                {/* File Drop Zone */}
                <TouchableOpacity
                  style={{
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: "#D1D5DB",
                    borderRadius: 14,
                    paddingVertical: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FAFAFA",
                    marginBottom: 16,
                  }}
                  onPress={handlePickFile}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#F3F4F6",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={28}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: 4,
                    }}
                  >
                    Click to select a CSV file
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                    Supports .csv files only
                  </Text>
                </TouchableOpacity>

                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#9CA3AF",
                      letterSpacing: 0.5,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    Columns
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {["name", "email", "enrollmentType", "company"].map(
                      (col) => (
                        <View
                          key={col}
                          style={{
                            backgroundColor: "#FFFFFF",
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: "#4B5563",
                            }}
                          >
                            {col}
                          </Text>
                        </View>
                      ),
                    )}
                    <View
                      style={{
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        borderStyle: "dashed",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "500",
                          color: "#9CA3AF",
                        }}
                      >
                        linkedinUrl{" "}
                        <Text style={{ fontSize: 9, color: "#D1D5DB" }}>
                          (optional)
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Parsing State */}
            {uploadStatus === "parsing" && (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <ActivityIndicator size="large" color="#000000" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#374151",
                    marginTop: 12,
                  }}
                >
                  Parsing {uploadFileName}...
                </Text>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  Validating data format
                </Text>
              </View>
            )}

            {/* Uploading State */}
            {uploadStatus === "uploading" && (
              <View style={{ paddingVertical: 20 }}>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 40, marginBottom: 4 }}>📤</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#000000",
                    }}
                  >
                    {uploadProgress}%
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}
                  >
                    Uploading guests...
                  </Text>
                </View>
                {/* Progress Bar */}
                <View
                  style={{
                    height: 8,
                    backgroundColor: "#F3F4F6",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      backgroundColor: "#000000",
                      borderRadius: 4,
                      width: `${uploadProgress}%`,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {uploadFileName} • Please wait...
                </Text>
              </View>
            )}

            {/* Success State */}
            {uploadStatus === "success" && (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#F0FDF4",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#22C55E" />
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#15803D",
                    marginBottom: 4,
                  }}
                >
                  All guests imported!
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  {uploadResults.successCount} guest
                  {uploadResults.successCount !== 1 ? "s" : ""} added
                  successfully
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#000000",
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 32,
                    marginTop: 20,
                  }}
                  onPress={() => setShowUploadModal(false)}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error State */}
            {uploadStatus === "error" && (
              <View>
                {/* Summary */}
                {uploadResults.total > 0 && (
                  <View
                    style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}
                  >
                    {uploadResults.successCount > 0 && (
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: "#F0FDF4",
                          borderRadius: 8,
                          padding: 10,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#BBF7D0",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: "#16A34A",
                          }}
                        >
                          {uploadResults.successCount}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color: "#4ADE80",
                            textTransform: "uppercase",
                          }}
                        >
                          Added
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "#FEF2F2",
                        borderRadius: 8,
                        padding: 10,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#FECACA",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#DC2626",
                        }}
                      >
                        {uploadResults.failureCount || uploadErrors.length}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: "#F87171",
                          textTransform: "uppercase",
                        }}
                      >
                        Failed
                      </Text>
                    </View>
                  </View>
                )}

                {/* Error List */}
                <ScrollView
                  style={{ maxHeight: 200 }}
                  showsVerticalScrollIndicator={false}
                >
                  {uploadErrors.slice(0, 10).map((err, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: "#FEF2F2",
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: "#FECACA",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 3,
                        }}
                      >
                        <Ionicons
                          name="alert-circle"
                          size={14}
                          color="#EF4444"
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#DC2626",
                            marginLeft: 6,
                          }}
                        >
                          {err.row > 0 ? `Row ${err.row}` : "Error"}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: "#7F1D1D" }}>
                        {err.error}
                      </Text>
                      {err.name && err.name !== "" && (
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#9CA3AF",
                            marginTop: 2,
                          }}
                        >
                          {err.name} • {err.email}
                        </Text>
                      )}
                    </View>
                  ))}
                  {uploadErrors.length > 10 && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      +{uploadErrors.length - 10} more errors
                    </Text>
                  )}
                </ScrollView>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#FFFFFF",
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                    onPress={() => setShowUploadModal(false)}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#4B5563",
                      }}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#000000",
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: "center",
                    }}
                    onPress={() => {
                      resetUploadModal();
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#FFFFFF",
                      }}
                    >
                      Try Again
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 20,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  statNumberGreen: {
    color: "#000000",
  },
  statNumberOrange: {
    color: "#000000",
  },
  statNumberBlue: {
    color: "#000000",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  statLabelGreen: {
    color: "#9CA3AF",
  },
  statLabelOrange: {
    color: "#9CA3AF",
  },
  statLabelBlue: {
    color: "#9CA3AF",
  },
  // Filter Bar
  filterBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  filterOptionActive: {
    backgroundColor: "#F9FAFB",
  },
  radioCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#000000",
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#000000",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
  },
  filterTextActive: {
    color: "#000000",
    fontWeight: "600",
  },
  // Form Card
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000000",
    marginBottom: 10,
    fontWeight: "500",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  enrollmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  enrollmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  enrollmentBtnActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  enrollmentBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  enrollmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#000000",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Upload Card
  uploadCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  uploadContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadTextBlock: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  uploadSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "400",
  },
  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  // Guest List
  listContainer: {
    paddingHorizontal: 20,
  },
  guestItem: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  guestInfo: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  guestEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "400",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionButtons: {
    flexDirection: "row",
    marginLeft: 8,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  editBtn: {
    backgroundColor: "#FFFFFF",
  },
  deleteBtn: {
    backgroundColor: "#FFFFFF",
  },
  checkInBtn: {
    backgroundColor: "#FFFFFF",
  },
  statusArrived: {
    backgroundColor: "#F9FAFB",
  },
  statusUnarrived: {
    backgroundColor: "#FFFFFF",
  },
  statusPending: {
    backgroundColor: "#FFFFFF",
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusTextArrived: { color: "#000000" },
  statusTextUnarrived: { color: "#6B7280" },
  statusTextPending: { color: "#9CA3AF" },
  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000000",
    marginBottom: 12,
    fontWeight: "500",
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  modalEnrollmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modalEnrollmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  modalEnrollmentBtnActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  modalEnrollmentBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  modalEnrollmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  modalUpdateButton: {
    flex: 1,
    backgroundColor: "#000000",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalUpdateButtonDisabled: {
    opacity: 0.5,
  },
  modalUpdateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
