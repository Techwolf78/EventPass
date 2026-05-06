import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGuestList,
  addGuest,
  getCheckedInCandidateIds,
  GuestListItem,
} from "@/utils/firestore";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Papa from "papaparse";
import { Ionicons } from "@expo/vector-icons";

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
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
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
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentType, setEnrollmentType] = useState<"masterclass" | "event">(
    "event",
  );
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    const [guestList, checkIns] = await Promise.all([
      getGuestList(),
      getCheckedInCandidateIds(),
    ]);
    setGuests(guestList);
    setCheckedInIds(new Set(checkIns));
    setLoading(false);
  };

  const handleAddGuest = async () => {
    if (!name.trim() || !email.trim()) {
      showAlert("Error", "Please fill in all fields");
      return;
    }
    setSubmitting(true);
    const result = await addGuest(name, email, enrollmentType);
    showAlert("Result", result.message);
    if (result.success) {
      setName("");
      setEmail("");
      setEnrollmentType("event");
      setShowForm(false);
      loadGuests();
    }
    setSubmitting(false);
  };

  const uploadValidGuests = async (
    guestsToUpload: {
      name: string;
      email: string;
      enrollmentType: "masterclass" | "event";
    }[],
  ) => {
    setLoading(true);
    let successCount = 0;
    let failureCount = 0;
    const failures: { name: string; email: string; error: string }[] = [];

    for (let i = 0; i < guestsToUpload.length; i++) {
      const guest = guestsToUpload[i];
      try {
        const result = await addGuest(
          guest.name,
          guest.email,
          guest.enrollmentType,
        );
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          failures.push({
            name: guest.name,
            email: guest.email,
            error: result.message,
          });
        }

        // Add a small delay to avoid overwhelming the API
        if (i < guestsToUpload.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        failureCount++;
        failures.push({
          name: guest.name,
          email: guest.email,
          error: error.message || "Unknown error",
        });
      }
    }

    setLoading(false);

    // Show upload summary
    let summaryMessage = `Upload Complete!\n\n✅ Successfully added: ${successCount}\n❌ Failed: ${failureCount}`;

    if (failures.length > 0) {
      summaryMessage += `\n\nFailed Guests:\n`;
      summaryMessage += failures
        .slice(0, 5)
        .map((f) => `• ${f.name} (${f.email})\n  Error: ${f.error}`)
        .join("\n\n");

      if (failures.length > 5) {
        summaryMessage += `\n\n... and ${failures.length - 5} more failures`;
      }
    }

    showAlert(
      successCount > 0 && failureCount === 0 ? "Success" : "Upload Summary",
      summaryMessage,
      [{ text: "OK", onPress: () => loadGuests() }],
    );
  };

  const handleUploadCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        showAlert("Upload canceled", "No file was selected.");
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        showAlert(
          "Upload Error",
          "No file data returned by the picker. Please try again.",
        );
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.name;
      const fileExtension = fileName.split(".").pop()?.toLowerCase();

      // Check if file is CSV or Excel
      if (!["csv", "xls", "xlsx"].includes(fileExtension || "")) {
        showAlert(
          "Error",
          "Please upload a CSV or Excel file (.csv, .xls, .xlsx)",
        );
        return;
      }

      let fileContent = "";

      // Handle CSV files
      if (fileExtension === "csv") {
        const webFile = "file" in asset ? (asset.file as File | null) : null;
        const looksLikeWebUri = (ri =
          fileUri.startsWith("blob:") ||
          fileUri.startsWith("data:") ||
          fileUri.startsWith("http"));

        try {
          if (webFile) {
            fileContent = await webFile.text();
          } else if (Platform.OS === "web" || looksLikeWebUri) {
            const response = await fetch(fileUri);
            fileContent = await response.text();
          } else {
            fileContent = await FileSystem.readAsStringAsync(fileUri);
          }
        } catch (readError: any) {
          const readMessage = readError?.message || String(readError);
          showAlert(
            "File Read Error",
            `Could not read the CSV file.\n\n${readMessage}`,
          );
          return;
        }
      } else {
        // For Excel files, we need to handle them differently
        showAlert(
          "Info",
          "Excel files need to be converted to CSV format. Please upload a CSV file for now.",
        );
        return;
      }

      const parseResult = Papa.parse(fileContent, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
      });

      if (parseResult.errors.length > 0) {
        showAlert(
          "CSV Parse Error",
          "Invalid CSV format. Please check the file structure.",
        );
        return;
      }

      // Validate and process each row
      const validGuests: {
        name: string;
        email: string;
        enrollmentType: "masterclass" | "event";
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
        const rowNumber = index + 2; // +2 because of header row and 0-index
        const name = row.name?.trim();
        const email = row.email?.trim();
        let enrollmentType = row.enrollmentType?.trim().toLowerCase();

        // Validate required fields
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

        // Validate enrollment type (case-insensitive)
        if (enrollmentType !== "masterclass" && enrollmentType !== "event") {
          errors.push({
            row: rowNumber,
            name,
            email,
            error:
              'Enrollment type must be "masterclass" or "event" (case-insensitive)',
          });
          return;
        }

        // Check for duplicate emails in the same upload
        const isDuplicateInUpload = validGuests.some(
          (guest) => guest.email.toLowerCase() === email.toLowerCase(),
        );

        if (isDuplicateInUpload) {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: "Duplicate email in the same file",
          });
          return;
        }

        // Check if email already exists in the existing guest list
        const existingGuest = guests.find(
          (guest) => guest.email.toLowerCase() === email.toLowerCase(),
        );

        if (existingGuest) {
          errors.push({
            row: rowNumber,
            name,
            email,
            error: `Email already exists (${existingGuest.name})`,
          });
          return;
        }

        // Add valid guest (enrollmentType is already lowercase)
        validGuests.push({
          name,
          email: email.toLowerCase(),
          enrollmentType: enrollmentType as "masterclass" | "event",
        });
      });

      // Show validation summary
      if (errors.length > 0) {
        let errorMessage = `Found ${errors.length} error(s) in the file:\n\n`;
        errorMessage += errors
          .slice(0, 5)
          .map(
            (err) =>
              `Row ${err.row}: ${err.error}\n   Name: ${err.name}\n   Email: ${err.email}`,
          )
          .join("\n\n");

        if (errors.length > 5) {
          errorMessage += `\n\n... and ${errors.length - 5} more errors`;
        }

        if (validGuests.length === 0) {
          showAlert("Validation Failed", errorMessage);
          return;
        }

        showAlert(
          "Partial Validation",
          `${validGuests.length} valid guest(s) found.\n${errors.length} error(s) found.\n\n${errorMessage}`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: `Upload ${validGuests.length} Valid Guest(s)`,
              onPress: async () => {
                await uploadValidGuests(validGuests);
              },
            },
          ],
        );
      } else if (validGuests.length > 0) {
        // All guests are valid
        showAlert(
          "Confirm Upload",
          `Upload ${validGuests.length} valid guest(s) from CSV/Excel?\n\nAll enrollment types will be stored in lowercase.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Upload",
              onPress: async () => {
                await uploadValidGuests(validGuests);
              },
            },
          ],
        );
      } else {
        showAlert("Error", "No valid guest entries found in the file");
      }
    } catch (error: any) {
      console.error("File upload error:", error);
      const errorMessage = error?.message || String(error);
      showAlert("Upload Error", `Upload failed.\n\n${errorMessage}`);
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
        <ActivityIndicator size="large" color="#8B5CF6" />
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? "close" : "add"} size={24} color="#fff" />
        </TouchableOpacity>
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add Guest Form */}
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
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
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
        <TouchableOpacity style={styles.uploadCard} onPress={handleUploadCSV}>
          <View style={styles.uploadContent}>
            <View style={styles.uploadIconBg}>
              <Ionicons name="cloud-upload" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.uploadTextBlock}>
              <Text style={styles.uploadTitle}>Upload CSV file</Text>
              <Text style={styles.uploadSubtitle}>
                name, email, enrollmentType (masterclass/event)
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>

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
              const status = getGuestStatus(item);
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
                    <Text style={styles.guestName} numberOfLines={1}>
                      {item.name}
                    </Text>
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
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // slate-900
  },
  scrollContent: {
    paddingBottom: 100, // accommodate tab bar
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
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f8fafc",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8b5cf6",
    marginTop: 4,
    letterSpacing: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#a78bfa",
  },
  statNumberGreen: {
    color: "#34d399",
  },
  statNumberOrange: {
    color: "#fbbf24",
  },
  statNumberBlue: {
    color: "#60a5fa",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 6,
    textAlign: "center",
    textTransform: "uppercase",
  },
  statLabelGreen: {
    color: "#34d399",
  },
  statLabelOrange: {
    color: "#fbbf24",
  },
  statLabelBlue: {
    color: "#60a5fa",
  },
  // Filter Bar
  filterBar: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 30,
    padding: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#a78bfa",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#a78bfa",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  filterTextActive: {
    color: "#a78bfa",
  },
  // Form Card
  formCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 14,
  },
  formInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#f8fafc",
    marginBottom: 12,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  enrollmentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  enrollmentBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  enrollmentBtnActive: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderColor: "#8b5cf6",
  },
  enrollmentBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  enrollmentBtnTextActive: {
    color: "#a78bfa",
  },
  submitButton: {
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  // Upload Card
  uploadCard: {
    backgroundColor: "#1e293b",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#8b5cf6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  uploadContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  uploadIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadTextBlock: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f8fafc",
  },
  uploadSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },
  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#f8fafc",
    fontWeight: "600",
  },
  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#0f172a",
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#a78bfa",
  },
  // Guest List
  listContainer: {
    paddingHorizontal: 20,
  },
  guestItem: {
    backgroundColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  guestInfo: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f8fafc",
  },
  guestEmail: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
  },
  statusArrived: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  statusUnarrived: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  statusPending: {
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderColor: "rgba(96, 165, 250, 0.2)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusTextArrived: {
    color: "#34d399",
  },
  statusTextUnarrived: {
    color: "#fbbf24",
  },
  statusTextPending: {
    color: "#60a5fa",
  },
  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: "#64748b",
    fontWeight: "700",
  },
});
