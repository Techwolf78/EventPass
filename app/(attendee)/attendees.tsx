import {
  Candidate,
  getAttendeeListWithCheckIn,
  getCheckedInCandidateIds,
} from "@/utils/firestore";
import { formatTimeAgo } from "@/utils/time";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// Premium color palette based on instructions
const AVATAR_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getFormattedCheckInTime = (timestamp: any) => {
  if (!timestamp) return null;
  try {
    const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${formattedDate} at ${formattedTime}`;
  } catch (e) {
    console.error(e);
    return "Checked In";
  }
};

export default function AttendeesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ search?: string }>();
  const [attendees, setAttendees] = useState<
    (Candidate & { checkInTime?: any })[]
  >([]);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "checked_in" | "pending" | "vip"
  >("all");
  const [toastMessage, setToastMessage] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [selectedAttendeeDetail, setSelectedAttendeeDetail] = useState<
    (Candidate & { checkInTime?: any }) | null
  >(null);

  // Simple, unified color palette for both events
  const themeColor = "#6366f1"; // Indigo-500
  const statusColor = "#10b981"; // Green for check-in status / live indicators

  useEffect(() => {
    loadAttendees(false);
  }, []);

  // Handle incoming search query and auto-open profile detail
  useEffect(() => {
    if (params.search && attendees.length > 0) {
      setSearchQuery(params.search);
      const queryLower = params.search.toLowerCase().trim();
      const matched = attendees.find(a => a.name.toLowerCase().includes(queryLower));
      if (matched) {
        setSelectedAttendeeDetail(matched);
      }
    }
  }, [params.search, attendees]);

  const loadAttendees = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [list, checkIns] = await Promise.all([
        getAttendeeListWithCheckIn(),
        getCheckedInCandidateIds(),
      ]);

      setAttendees(list);
      setCheckedInIds(new Set(checkIns));
    } catch (err) {
      console.error("Error loading attendees:", err);
      setError("Failed to load attendees. Please try again.");
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const handleSync = async () => {
    if (cooldown) return;
    setRefreshing(true);
    try {
      await loadAttendees(true);
    } finally {
      setRefreshing(false);
      setToastMessage("Attendance data refreshed");
      setTimeout(() => setToastMessage(""), 3000);

      setCooldown(true);
      setTimeout(() => setCooldown(false), 5000);
    }
  };

  const stats = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter((a) => checkedInIds.has(a.id)).length;
    const pending = total - checkedIn;
    const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    return { total, checkedIn, pending, rate };
  }, [attendees, checkedInIds]);

  const filteredAttendees = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return attendees.filter((attendee) => {
      const isCheckedIn = checkedInIds.has(attendee.id);

      // Filter by status
      if (activeFilter === "checked_in" && !isCheckedIn) return false;
      if (activeFilter === "pending" && isCheckedIn) return false;

      const isVIP = attendee.isVIP || false;
      if (activeFilter === "vip" && !isVIP) return false;

      if (!normalized) return true;
      const companyName = attendee.companyName?.toLowerCase() || "";
      return (
        attendee.name.toLowerCase().includes(normalized) ||
        attendee.email.toLowerCase().includes(normalized) ||
        companyName.includes(normalized)
      );
    });
  }, [attendees, checkedInIds, searchQuery, activeFilter]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Loading operations dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: themeColor }]}
          onPress={() => loadAttendees()}
        >
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Attendee Management</Text>
          <View style={styles.subtitleRow}>
            <View
              style={[styles.liveIndicator, { backgroundColor: statusColor }]}
            />
            <Text style={styles.headerSubtitle}>Live Check-In Monitoring</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.syncButton,
            (refreshing || cooldown) && { opacity: 0.7 },
          ]}
          onPress={handleSync}
          disabled={refreshing || cooldown}
          activeOpacity={0.6}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={cooldown ? "checkmark" : "sync"}
                size={16}
                color="#000000"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.syncButtonText}>{cooldown ? "" : ""}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Checked In</Text>
              <Ionicons
                name="checkmark-circle-outline"
                size={14}
                color={statusColor}
              />
            </View>
            <Text style={[styles.statValue, { color: statusColor }]}>
              {stats.checkedIn}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Attendance Rate</Text>
              <Ionicons
                name="trending-up-outline"
                size={14}
                color={themeColor}
              />
            </View>
            <Text style={[styles.statValue, { color: themeColor }]}>
              {stats.rate}%
            </Text>
          </View>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchAndFilterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#94A3B8"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, or company"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
          style={styles.filtersContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "all" && [
                styles.activeFilterChip,
                { backgroundColor: themeColor, borderColor: themeColor },
              ],
            ]}
            onPress={() => setActiveFilter("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "all" && styles.activeFilterChipText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "checked_in" && [
                styles.activeFilterChip,
                { backgroundColor: themeColor, borderColor: themeColor },
              ],
            ]}
            onPress={() => setActiveFilter("checked_in")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "checked_in" && styles.activeFilterChipText,
              ]}
            >
              Checked In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "pending" && [
                styles.activeFilterChip,
                { backgroundColor: themeColor, borderColor: themeColor },
              ],
            ]}
            onPress={() => setActiveFilter("pending")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "pending" && styles.activeFilterChipText,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilter === "vip" && [
                styles.activeFilterChip,
                { backgroundColor: themeColor, borderColor: themeColor },
              ],
            ]}
            onPress={() => setActiveFilter("vip")}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === "vip" && styles.activeFilterChipText,
              ]}
            >
              VIP
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Attendee List */}
      <FlatList
        data={filteredAttendees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleSync}
        renderItem={({ item, index }) => {
          const isCheckedIn = checkedInIds.has(item.id);
          const isVIP = item.isVIP || false;

          return (
            <View style={styles.attendeeCard}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                onPress={() => setSelectedAttendeeDetail(item)}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(item.name) },
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>

                <View style={styles.attendeeInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.attendeeName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {isVIP && (
                      <View style={styles.vipBadge}>
                        <Text style={styles.vipBadgeText}>VIP</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.attendeeEmail} numberOfLines={1}>
                    {item.email}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.departmentContainer}>
                      <Ionicons
                        name="business-outline"
                        size={12}
                        color="#64748B"
                      />
                      <Text style={styles.departmentText} numberOfLines={1}>
                        {item.companyName || "General"}
                      </Text>
                    </View>

                    {isCheckedIn && (
                      <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={12} color="#64748B" />
                        <Text style={styles.timeText}>
                          {formatTimeAgo(item.checkInTime)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isCheckedIn
                      ? [styles.statusBadgeChecked, { borderColor: statusColor }]
                      : styles.statusBadgePending,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      isCheckedIn
                        ? { backgroundColor: statusColor }
                        : styles.statusDotPending,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isCheckedIn
                        ? styles.statusBadgeTextChecked
                        : styles.statusBadgeTextPending,
                    ]}
                  >
                    {isCheckedIn ? "Arrived" : "Pending"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkedinButton}
                onPress={() => {
                  const url =
                    item.linkedinUrl || "https://www.linkedin.com/feed/";
                  Linking.openURL(url).catch((err) =>
                    console.error("Couldn't load page", err),
                  );
                }}
              >
                <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No attendees found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filters to find what {"you're"}{" "}
              looking for.
            </Text>
          </View>
        }
      />

      {/* Toast Message */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      {/* iOS/Truecaller-style Attendee Detail Modal */}
      <Modal
        visible={!!selectedAttendeeDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedAttendeeDetail(null)}
      >
        <View style={styles.tcOverlay}>
          {/* Backdrop Touch Target */}
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setSelectedAttendeeDetail(null)}
          />
          <View style={styles.tcContent}>
            {/* Header / Top bar with handles */}
            <View style={styles.tcTopHeader}>
              <View style={{ width: 26 }} />
              <View style={styles.tcHandle} />
              <TouchableOpacity
                onPress={() => setSelectedAttendeeDetail(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedAttendeeDetail && (() => {
              const isCheckedIn = checkedInIds.has(selectedAttendeeDetail.id);
              const formattedTime = getFormattedCheckInTime(selectedAttendeeDetail.checkInTime);
              return (
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.tcScrollContent}
                >
                  {/* Top Profile Card */}
                  <View style={styles.tcProfileHeader}>
                    <View
                      style={[
                        styles.tcLargeAvatar,
                        { backgroundColor: getAvatarColor(selectedAttendeeDetail.name) },
                      ]}
                    >
                      <Text style={styles.tcLargeAvatarText}>
                        {getInitials(selectedAttendeeDetail.name)}
                      </Text>
                      {selectedAttendeeDetail.isVIP && (
                        <View style={styles.tcCrownBadge}>
                          <Ionicons name="ribbon" size={14} color="#fff" />
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.tcProfileName}>{selectedAttendeeDetail.name}</Text>
                    {selectedAttendeeDetail.companyName ? (
                      <Text style={styles.tcProfileSubtitle}>
                        {selectedAttendeeDetail.companyName}
                      </Text>
                    ) : (
                      <Text style={styles.tcProfileSubtitle}>Independent Attendee</Text>
                    )}

                    {/* VIP glowing badge */}
                    {selectedAttendeeDetail.isVIP && (
                      <View style={styles.tcVipBadge}>
                        <Ionicons name="star" size={12} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.tcVipBadgeText}>VIP ATTENDEE</Text>
                      </View>
                    )}
                  </View>

                  {/* iOS Quick Actions Row */}
                  <View style={styles.tcQuickActionsRow}>
                    {/* LinkedIn Action */}
                    <TouchableOpacity
                      style={[
                        styles.tcActionCol,
                        !selectedAttendeeDetail.linkedinUrl && { opacity: 0.4 }
                      ]}
                      disabled={!selectedAttendeeDetail.linkedinUrl}
                      onPress={() => {
                        if (selectedAttendeeDetail.linkedinUrl) {
                          Linking.openURL(selectedAttendeeDetail.linkedinUrl);
                        }
                      }}
                    >
                      <View style={styles.tcActionIconCircle}>
                        <Ionicons name="logo-linkedin" size={22} color="#0a66c2" />
                      </View>
                      <Text style={styles.tcActionLabel}>LinkedIn</Text>
                    </TouchableOpacity>

                    {/* Email Action */}
                    <TouchableOpacity
                      style={styles.tcActionCol}
                      onPress={() => {
                        if (selectedAttendeeDetail.email) {
                          Linking.openURL(`mailto:${selectedAttendeeDetail.email}`);
                        }
                      }}
                    >
                      <View style={styles.tcActionIconCircle}>
                        <Ionicons name="mail" size={22} color="#0284c7" />
                      </View>
                      <Text style={styles.tcActionLabel}>Email</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Grouped Info Sections (iOS Style Cards) */}
                  <View style={styles.tcGroup}>
                    <Text style={styles.tcGroupTitle}>CONTACT DETAILS</Text>
                    <View style={styles.tcCard}>
                      <View style={styles.tcRow}>
                        <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.tcRowIcon} />
                        <View style={styles.tcRowTextContainer}>
                          <Text style={styles.tcRowLabel}>Email</Text>
                          <Text style={styles.tcRowValue}>{selectedAttendeeDetail.email}</Text>
                        </View>
                      </View>
                      <View style={styles.tcRowBorder} />
                      <View style={styles.tcRow}>
                        <Ionicons name="business-outline" size={18} color="#64748b" style={styles.tcRowIcon} />
                        <View style={styles.tcRowTextContainer}>
                          <Text style={styles.tcRowLabel}>Company</Text>
                          <Text style={styles.tcRowValue}>
                            {selectedAttendeeDetail.companyName || "Not Specified"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tcGroup}>
                    <Text style={styles.tcGroupTitle}>EVENT TICKET & PRIVILEGES</Text>
                    <View style={styles.tcCard}>
                      <View style={styles.tcRow}>
                        <Ionicons name="ticket-outline" size={18} color="#64748b" style={styles.tcRowIcon} />
                        <View style={styles.tcRowTextContainer}>
                          <Text style={styles.tcRowLabel}>Pass Type</Text>
                          <Text style={styles.tcRowValue}>
                            {selectedAttendeeDetail.enrollmentType === "masterclass"
                              ? "Exclusive Masterclass Pass"
                              : "Synergy Sphere General Pass"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.tcRowBorder} />
                      <View style={styles.tcRow}>
                        <Ionicons name="information-circle-outline" size={18} color="#64748b" style={styles.tcRowIcon} />
                        <View style={styles.tcRowTextContainer}>
                          <Text style={styles.tcRowLabel}>Registration ID</Text>
                          <Text style={styles.tcRowValue}>{selectedAttendeeDetail.id}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tcGroup}>
                    <Text style={styles.tcGroupTitle}>CHECK-IN TIMELINE</Text>
                    <View style={styles.tcCard}>
                      <View style={styles.tcRow}>
                        <Ionicons 
                          name={isCheckedIn ? "ellipse" : "ellipse-outline"} 
                          size={16} 
                          color={isCheckedIn ? "#22c55e" : "#cbd5e1"} 
                          style={styles.tcRowIcon} 
                        />
                        <View style={styles.tcRowTextContainer}>
                          <Text style={styles.tcRowLabel}>Arrival Status</Text>
                          <Text 
                            style={[
                              styles.tcRowValue, 
                              isCheckedIn ? { color: "#10b981", fontWeight: "700" } : { color: "#64748b" }
                            ]}
                          >
                            {isCheckedIn ? "Arrived & Verified" : "Pending Registration"}
                          </Text>
                        </View>
                      </View>
                      {isCheckedIn && formattedTime && (
                        <>
                          <View style={styles.tcRowBorder} />
                          <View style={styles.tcRow}>
                            <Ionicons name="time-outline" size={18} color="#64748b" style={styles.tcRowIcon} />
                            <View style={styles.tcRowTextContainer}>
                              <Text style={styles.tcRowLabel}>Checked In Time</Text>
                              <Text style={styles.tcRowValue}>{formattedTime}</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={{ height: 60 }} />
                </ScrollView>
              );
            })()}
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF6", // Soft gray/white background
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAF6",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAF6",
    paddingHorizontal: 24,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4F46E5",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  statsContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  searchAndFilterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  filtersContainer: {
    marginTop: 10,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeFilterChip: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  attendeeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  attendeeInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 6,
    maxWidth: "70%",
  },
  vipBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
  },
  attendeeEmail: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  departmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  departmentText: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 4,
    maxWidth: 100,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeChecked: {
    backgroundColor: "#ECFDF5",
    borderColor: "#D1FAE5",
  },
  statusBadgePending: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotChecked: {
    backgroundColor: "#10B981",
  },
  statusDotPending: {
    backgroundColor: "#94A3B8",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadgeTextChecked: {
    color: "#065F46",
  },
  statusBadgeTextPending: {
    color: "#475569",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  linkedinButton: {
    padding: 6,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  toastContainer: {
    position: "absolute",
    bottom: 40,
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
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  // Truecaller / iOS Style Details Modal
  tcOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  tcContent: {
    backgroundColor: "#F2F2F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    width: "100%",
    maxWidth: 550,
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  tcTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  tcHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#E5E5EA",
    borderRadius: 2.5,
  },
  tcScrollContent: {
    paddingBottom: 40,
  },
  tcProfileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  tcLargeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tcLargeAvatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  tcCrownBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: "#f59e0b",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  tcProfileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    marginTop: 12,
  },
  tcProfileSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "500",
  },
  tcVipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  tcVipBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tcQuickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    marginBottom: 16,
  },
  tcActionCol: {
    alignItems: "center",
    width: 75,
  },
  tcActionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tcActionLabel: {
    fontSize: 11,
    color: "#1C1C1E",
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  tcGroup: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  tcGroupTitle: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 12,
    letterSpacing: 0.4,
  },
  tcCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  tcRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tcRowBorder: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginLeft: 48,
  },
  tcRowIcon: {
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },
  tcRowTextContainer: {
    flex: 1,
  },
  tcRowLabel: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "600",
  },
  tcRowValue: {
    fontSize: 14,
    color: "#000000",
    marginTop: 2,
    fontWeight: "500",
  },
});
