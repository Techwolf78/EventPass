import { useAuth } from "@/context/AuthContext";
import {
  Candidate,
  getAttendeeList,
  getCheckedInCandidateIds,
} from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.42; // For stats cards

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

export default function AttendeesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [attendees, setAttendees] = useState<Candidate[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "checked_in" | "pending" | "vip"
  >("all");

  useEffect(() => {
    loadAttendees();
  }, []);

  const loadAttendees = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, checkIns] = await Promise.all([
        getAttendeeList(),
        getCheckedInCandidateIds(),
      ]);

      setAttendees(list);
      setCheckedInIds(new Set(checkIns));
    } catch (err) {
      console.error("Error loading attendees:", err);
      setError("Failed to load attendees. Please try again.");
    } finally {
      setLoading(false);
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

      // Mock VIP for demo (e.g., every 5th attendee or specific condition)
      // In a real app, this would be a property on the attendee object
      const isVIP = attendee.id.charCodeAt(0) % 5 === 0;
      if (activeFilter === "vip" && !isVIP) return false;

      if (!normalized) return true;
      const department = attendee.department?.toLowerCase() || "";
      return (
        attendee.name.toLowerCase().includes(normalized) ||
        attendee.email.toLowerCase().includes(normalized) ||
        department.includes(normalized)
      );
    });
  }, [attendees, checkedInIds, searchQuery, activeFilter]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
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
        <TouchableOpacity style={styles.retryButton} onPress={loadAttendees}>
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
            <View style={styles.liveIndicator} />
            <Text style={styles.headerSubtitle}>Live Check-In Monitoring</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAttendees}>
          <Ionicons name="refresh" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Total Registered</Text>
              <Ionicons name="people-outline" size={16} color="#64748B" />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Checked In</Text>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#10B981"
              />
            </View>
            <Text style={[styles.statValue, { color: "#10B981" }]}>
              {stats.checkedIn}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Pending</Text>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: "#F59E0B" }]}>
              {stats.pending}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Attendance Rate</Text>
              <Ionicons name="trending-up-outline" size={16} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: "#3B82F6" }]}>
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
            placeholder="Search name, email, or department"
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
              activeFilter === "all" && styles.activeFilterChip,
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
              activeFilter === "checked_in" && styles.activeFilterChip,
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
              activeFilter === "pending" && styles.activeFilterChip,
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
              activeFilter === "vip" && styles.activeFilterChip,
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
        renderItem={({ item, index }) => {
          const isCheckedIn = checkedInIds.has(item.id);
          const isVIP = item.id.charCodeAt(0) % 5 === 0; // Mock VIP

          return (
            <View style={styles.attendeeCard}>
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
                      {item.department || "General"}
                    </Text>
                  </View>

                  {isCheckedIn && (
                    <View style={styles.timeContainer}>
                      <Ionicons name="time-outline" size={12} color="#64748B" />
                      <Text style={styles.timeText}>Just now</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.linkedinButton}
                onPress={() => {
                  const url = item.linkedinUrl || "https://www.linkedin.com/feed/";
                  Linking.openURL(url).catch((err) =>
                    console.error("Couldn't load page", err)
                  );
                }}
              >
                <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
              </TouchableOpacity>

              <View
                style={[
                  styles.statusBadge,
                  isCheckedIn
                    ? styles.statusBadgeChecked
                    : styles.statusBadgePending,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isCheckedIn
                      ? styles.statusDotChecked
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
              Try adjusting your search or filters to find what you're looking
              for.
            </Text>
          </View>
        }
      />
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
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    width: "48%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
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
});
