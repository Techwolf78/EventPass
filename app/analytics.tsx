import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "expo-router";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getGuestList, getCheckedInCandidateIds, GuestListItem } from "@/utils/firestore";

const supportHref = "/support" as any;

// High-fidelity fallback mock data for offline/empty-db preview
const MOCK_GUESTS: GuestListItem[] = [
  // Masterclass guests
  {
    id: "mc1",
    name: "John Doe",
    nameLower: "john doe",
    email: "john.doe@gmail.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token1",
    enrollmentType: "masterclass",
    companyName: "Google LLC",
    isVIP: true,
  },
  {
    id: "mc2",
    name: "Jane Smith",
    nameLower: "jane smith",
    email: "jane.smith@microsoft.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token2",
    enrollmentType: "masterclass",
    companyName: "Microsoft Corp",
    isVIP: false,
  },
  {
    id: "mc3",
    name: "Bob Johnson",
    nameLower: "bob johnson",
    email: "bob.johnson@amazon.com",
    status: "pending",
    registeredAt: null,
    qrToken: null,
    enrollmentType: "masterclass",
    companyName: "Amazon Inc",
    isVIP: false,
  },
  {
    id: "mc4",
    name: "Alice Williams",
    nameLower: "alice williams",
    email: "alice.williams@stripe.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token3",
    enrollmentType: "masterclass",
    companyName: "Stripe",
    isVIP: true,
  },
  {
    id: "mc5",
    name: "Charlie Brown",
    nameLower: "charlie brown",
    email: "charlie.brown@netflix.com",
    status: "pending",
    registeredAt: null,
    qrToken: null,
    enrollmentType: "masterclass",
    companyName: "Netflix",
    isVIP: false,
  },
  {
    id: "mc6",
    name: "David Lee",
    nameLower: "david lee",
    email: "david.lee@openai.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token4",
    enrollmentType: "masterclass",
    companyName: "OpenAI",
    isVIP: false,
  },
  {
    id: "mc7",
    name: "Emma Watson",
    nameLower: "emma watson",
    email: "emma.watson@un.org",
    status: "registered",
    registeredAt: null,
    qrToken: "token5",
    enrollmentType: "masterclass",
    companyName: "United Nations",
    isVIP: true,
  },
  // Synergy Sphere guests
  {
    id: "ev1",
    name: "Liam Neeson",
    nameLower: "liam neeson",
    email: "liam.neeson@universal.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token6",
    enrollmentType: "event",
    companyName: "Universal Pictures",
    isVIP: true,
  },
  {
    id: "ev2",
    name: "Noah Centineo",
    nameLower: "noah centineo",
    email: "noah.c@netflix.com",
    status: "pending",
    registeredAt: null,
    qrToken: null,
    enrollmentType: "event",
    companyName: "Netflix",
    isVIP: false,
  },
  {
    id: "ev3",
    name: "Oliver Queen",
    nameLower: "oliver queen",
    email: "oliver.queen@queen.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token7",
    enrollmentType: "event",
    companyName: "Queen Industries",
    isVIP: false,
  },
  {
    id: "ev4",
    name: "Sophia Loren",
    nameLower: "sophia loren",
    email: "sophia.loren@cinema.it",
    status: "pending",
    registeredAt: null,
    qrToken: null,
    enrollmentType: "event",
    companyName: "Cinecittà",
    isVIP: true,
  },
  {
    id: "ev5",
    name: "Isabella Rossellini",
    nameLower: "isabella rossellini",
    email: "isabella.r@beauty.com",
    status: "registered",
    registeredAt: null,
    qrToken: "token8",
    enrollmentType: "event",
    companyName: "Lancôme Paris",
    isVIP: false,
  },
  {
    id: "ev6",
    name: "Mia Hamm",
    nameLower: "mia hamm",
    email: "mia.hamm@soccer.org",
    status: "registered",
    registeredAt: null,
    qrToken: "token9",
    enrollmentType: "event",
    companyName: "US Soccer",
    isVIP: false,
  },
];

// Mock checked in candidate IDs (for fallback preview)
const MOCK_CHECKED_IN: string[] = ["mc1", "mc4", "mc7", "ev3", "ev6"];

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"masterclass" | "event">("event");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "registered" | "arrived">("all");
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dbGuests, dbCheckIns] = await Promise.all([
        getGuestList(),
        getCheckedInCandidateIds(),
      ]);

      if (dbGuests && dbGuests.length > 0) {
        setGuests(dbGuests);
        setCheckedInIds(new Set(dbCheckIns || []));
        setIsUsingMockData(false);
      } else {
        // Fallback to mock data if Firestore is empty
        setGuests(MOCK_GUESTS);
        setCheckedInIds(new Set(MOCK_CHECKED_IN));
        setIsUsingMockData(true);
      }
    } catch (error) {
      console.warn("Firestore fetch failed, falling back to mock data:", error);
      setGuests(MOCK_GUESTS);
      setCheckedInIds(new Set(MOCK_CHECKED_IN));
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const getGuestStatus = useCallback(
    (guest: GuestListItem) => {
      if (guest.status === "registered") {
        return checkedInIds.has(guest.id) ? "arrived" : "unarrived";
      }
      return "pending";
    },
    [checkedInIds]
  );

  // Compute lists & metrics for active tab
  const filteredAndCategorized = useMemo(() => {
    const tabGuests = guests.filter((g) => g.enrollmentType === activeTab);
    const searchLower = searchQuery.toLowerCase().trim();

    const searched = tabGuests.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(searchLower) ||
        g.email.toLowerCase().includes(searchLower) ||
        (g.companyName && g.companyName.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      const status = getGuestStatus(g);
      if (filterStatus === "all") return true;
      if (filterStatus === "pending") return status === "pending";
      if (filterStatus === "registered") return status === "unarrived";
      if (filterStatus === "arrived") return status === "arrived";
      return true;
    });

    const total = tabGuests.length;
    const registered = tabGuests.filter((g) => g.status === "registered").length;
    const pending = tabGuests.filter((g) => g.status === "pending").length;
    const checkedIn = tabGuests.filter((g) => getGuestStatus(g) === "arrived").length;
    
    // Attendance rate = checked in / registered guests * 100
    const attendanceRate = registered > 0 ? Math.round((checkedIn / registered) * 100) : 0;

    return {
      rows: searched,
      stats: {
        total,
        registered,
        pending,
        checkedIn,
        attendanceRate,
      },
    };
  }, [guests, activeTab, searchQuery, filterStatus, getGuestStatus]);

  const { rows, stats } = filteredAndCategorized;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">

        {/* Dashboard Title & Live Badge */}
        <View className="mb-6 flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <View>
            <Text className="text-3xl font-black text-slate-900 leading-tight">
              Event Analytics
            </Text>
            <Text className="text-sm font-medium text-slate-500 mt-1">
              Real-time attendance & check-in analytics dashboard.
            </Text>
          </View>

          {/* Live Indicator & Refresh Button */}
          <View className="flex-row items-center self-start gap-3">
            {/* Live Indicator */}
            <View className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5 shadow-sm">
              <View className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Text className="text-xs font-bold text-emerald-800">
                Live Updates Active
              </Text>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshing}
              className="flex-row items-center justify-center p-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Ionicons name="refresh" size={16} color="#0f172a" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isUsingMockData && (
          <View className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex-row items-center gap-3">
            <Ionicons name="information-circle" size={20} color="#b45309" />
            <Text className="flex-1 text-xs font-semibold text-amber-800 leading-relaxed">
              Showing preview dashboard data. Pull to refresh or verify database collections to load active event records.
            </Text>
          </View>
        )}

        {/* Premium Switcher Tab Bar */}
        <View className="bg-slate-200/60 p-1.5 rounded-2xl flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab("event")}
            activeOpacity={0.9}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${
              activeTab === "event" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Ionicons
              name="grid"
              size={16}
              color={activeTab === "event" ? "#0f172a" : "#64748b"}
            />
            <Text
              className={`text-sm font-extrabold ${
                activeTab === "event" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              {"Gryphon Academy's Synergy Sphere 2.0"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("masterclass")}
            activeOpacity={0.9}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${
              activeTab === "masterclass" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Ionicons
              name="school"
              size={16}
              color={activeTab === "masterclass" ? "#0f172a" : "#64748b"}
            />
            <Text
              className={`text-sm font-extrabold ${
                activeTab === "masterclass" ? "text-slate-900" : "text-slate-500"
              }`}
            >
              {"Gryphon Academy's Masterclass 3.0"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Compact Metrics Row */}
        <View className="flex-row gap-2 mb-6">
          
          {/* Total Invited */}
          <View className="flex-1 min-w-0 bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm items-center justify-center">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center" numberOfLines={1}>
              Invited
            </Text>
            <Text className="text-lg font-black text-slate-900 mt-1">
              {stats.total}
            </Text>
            <Text className="text-[9px] text-slate-400 mt-0.5 text-center" numberOfLines={1}>
              Total Guests
            </Text>
          </View>

          {/* Registered */}
          <View className="flex-1 min-w-0 bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm items-center justify-center">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center" numberOfLines={1}>
              Registered
            </Text>
            <Text className="text-lg font-black text-slate-900 mt-1">
              {stats.registered}
            </Text>
            <Text className="text-[9px] text-blue-500 font-semibold mt-0.5 text-center" numberOfLines={1}>
              {stats.total > 0 ? Math.round((stats.registered / stats.total) * 100) : 0}% Setup
            </Text>
          </View>

          {/* Checked-In */}
          <View className="flex-1 min-w-0 bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm items-center justify-center">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center" numberOfLines={1}>
              Checked-In
            </Text>
            <Text className="text-lg font-black text-slate-900 mt-1">
              {stats.checkedIn}
            </Text>
            <Text className="text-[9px] text-emerald-500 font-semibold mt-0.5 text-center" numberOfLines={1}>
              {stats.checkedIn} Arrived
            </Text>
          </View>

          {/* Turnout Rate */}
          <View className="flex-1 min-w-0 bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm items-center justify-center">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center" numberOfLines={1}>
              Turnout
            </Text>
            <Text className="text-lg font-black text-slate-900 mt-1">
              {stats.attendanceRate}%
            </Text>
            <Text className="text-[9px] text-purple-500 font-semibold mt-0.5 text-center" numberOfLines={1}>
              Attendance
            </Text>
          </View>

        </View>

        {/* Status Radio Filters */}
        <View className="flex-row flex-wrap items-center justify-start gap-2.5 md:gap-4 mb-6 px-1">
          <Text className="text-[10px] md:text-xs font-bold text-slate-500 mr-1 md:mr-2 uppercase tracking-wider">
            Filter Status:
          </Text>

          {/* All Button */}
          <TouchableOpacity
            onPress={() => setFilterStatus("all")}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 md:gap-1.5"
          >
            <View className={`h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border items-center justify-center ${
              filterStatus === "all" ? "border-slate-900 bg-slate-900/5" : "border-slate-300"
            }`}>
              {filterStatus === "all" && (
                <View className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-slate-900" />
              )}
            </View>
            <Text className={`text-[10px] md:text-xs font-bold ${
              filterStatus === "all" ? "text-slate-900" : "text-slate-500"
            }`}>
              All
            </Text>
          </TouchableOpacity>

          {/* Pending Button */}
          <TouchableOpacity
            onPress={() => setFilterStatus("pending")}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 md:gap-1.5"
          >
            <View className={`h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border items-center justify-center ${
              filterStatus === "pending" ? "border-amber-500 bg-amber-500/5" : "border-slate-300"
            }`}>
              {filterStatus === "pending" && (
                <View className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-amber-500" />
              )}
            </View>
            <Text className={`text-[10px] md:text-xs font-bold ${
              filterStatus === "pending" ? "text-amber-700" : "text-slate-500"
            }`}>
              Pending
            </Text>
          </TouchableOpacity>

          {/* Registered Button */}
          <TouchableOpacity
            onPress={() => setFilterStatus("registered")}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 md:gap-1.5"
          >
            <View className={`h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border items-center justify-center ${
              filterStatus === "registered" ? "border-blue-500 bg-blue-500/5" : "border-slate-300"
            }`}>
              {filterStatus === "registered" && (
                <View className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-blue-500" />
              )}
            </View>
            <Text className={`text-[10px] md:text-xs font-bold ${
              filterStatus === "registered" ? "text-blue-700" : "text-slate-500"
            }`}>
              Registered
            </Text>
          </TouchableOpacity>

          {/* Arrived Button */}
          <TouchableOpacity
            onPress={() => setFilterStatus("arrived")}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 md:gap-1.5"
          >
            <View className={`h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border items-center justify-center ${
              filterStatus === "arrived" ? "border-emerald-500 bg-emerald-500/5" : "border-slate-300"
            }`}>
              {filterStatus === "arrived" && (
                <View className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500" />
              )}
            </View>
            <Text className={`text-[10px] md:text-xs font-bold ${
              filterStatus === "arrived" ? "text-emerald-700" : "text-slate-500"
            }`}>
              Arrived
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="relative bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row items-center mb-6 shadow-sm">
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            placeholder="Search attendees by name, email or company..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              fontWeight: "500",
              color: "#0f172a",
              outlineStyle: "none",
            } as any}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Attendee Rows / List Card */}
        <View className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Card Header */}
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between bg-slate-50/50">
            <Text className="text-sm font-bold text-slate-700">
              Attendee List ({rows.length})
            </Text>
            <Text className="text-xs font-semibold text-slate-400">
              {activeTab === "event" ? "Gryphon Academy's Synergy Sphere 2.0" : "Gryphon Academy's Masterclass 3.0"}
            </Text>
          </View>

          {/* Table Header for Desktop (visible on medium & large screens) */}
          {rows.length > 0 && !loading && (
            <View className="hidden md:flex flex-row items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/20">
              <View style={Platform.OS === 'web' ? { width: '40%', flexShrink: 0 } : undefined}>
                <Text className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Attendee</Text>
              </View>
              <View style={Platform.OS === 'web' ? { width: '25%', flexShrink: 0 } : undefined}>
                <Text className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Company</Text>
              </View>
              <View style={Platform.OS === 'web' ? { width: '15%', flexShrink: 0 } : undefined} className="items-center">
                <Text className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-center">LinkedIn</Text>
              </View>
              <View style={Platform.OS === 'web' ? { width: '20%', flexShrink: 0 } : undefined} className="items-end">
                <Text className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Status</Text>
              </View>
            </View>
          )}

          {/* Rows Body */}
          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#0f172a" />
              <Text className="text-sm font-medium text-slate-400 mt-3">
                Loading attendee analytics...
              </Text>
            </View>
          ) : rows.length === 0 ? (
            <View className="py-16 items-center justify-center px-4">
              <View className="h-12 w-12 rounded-full bg-slate-100 items-center justify-center mb-3">
                <Ionicons name="search-outline" size={22} color="#64748b" />
              </View>
              <Text className="text-base font-bold text-slate-800 text-center">
                No attendees found
              </Text>
              <Text className="text-sm text-slate-400 text-center mt-1 max-w-[280px]">
                Try adjusting your search query or refresh the page to try again.
              </Text>
            </View>
          ) : (
            <View className="divide-y divide-slate-100">
              {rows.map((guest) => {
                const status = getGuestStatus(guest);
                
                // Color codes configuration matching user request for "name of rows status : and status colors"
                let statusColorClass = "";
                let statusBgClass = "";
                let statusText = "";

                if (status === "arrived") {
                  statusBgClass = "bg-emerald-50 border border-emerald-100";
                  statusColorClass = "text-emerald-700";
                  statusText = "Checked-in";
                } else if (status === "unarrived") {
                  statusBgClass = "bg-blue-50 border border-blue-100";
                  statusColorClass = "text-blue-700";
                  statusText = "Registered";
                } else {
                  statusBgClass = "bg-amber-50 border border-amber-100";
                  statusColorClass = "text-amber-700";
                  statusText = "Pending";
                }

                return (
                  <View
                    key={guest.id}
                    className="flex-row items-center justify-between p-3.5 hover:bg-slate-50/20"
                  >
                    
                    {/* User Profile / Details Column (40% width on desktop) */}
                    <View
                      style={Platform.OS === 'web' ? { width: '40%', flexShrink: 0 } : undefined}
                      className="flex-row items-center gap-3 flex-1 min-w-0"
                    >
                      
                      {/* Avatar - Hidden on mobile, visible on desktop */}
                      <View className={`hidden md:flex h-10 w-10 rounded-full items-center justify-center shrink-0 ${getAvatarColor(guest.name)}`}>
                        <Text className="text-xs font-bold text-white">
                          {getInitials(guest.name)}
                        </Text>
                      </View>

                      {/* Name / Email */}
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-sm font-extrabold text-slate-900 truncate">
                            {guest.name}
                          </Text>
                          {guest.isVIP && (
                            <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 shrink-0">
                              <Ionicons name="star" size={8} color="#b45309" />
                              <Text className="text-[9px] font-black text-amber-800 uppercase tracking-wider">
                                VIP
                              </Text>
                            </View>
                          )}
                        </View>
                        {/* Email - Hidden on mobile, visible on desktop */}
                        <Text className="hidden md:flex text-xs font-semibold text-slate-400 mt-0.5 truncate">
                          {guest.email}
                        </Text>
                      </View>
                    </View>

                    {/* Company Column (25% width on desktop) - Hidden on mobile */}
                    <View
                      style={Platform.OS === 'web' ? { width: '25%', flexShrink: 0 } : undefined}
                      className="hidden md:flex flex-row items-center gap-1 min-w-0"
                    >
                      {guest.companyName ? (
                        <Text className="text-xs font-bold text-slate-600 truncate">
                          {guest.companyName}
                        </Text>
                      ) : (
                        <Text className="text-xs font-bold text-slate-300">—</Text>
                      )}
                    </View>

                    {/* LinkedIn Column (15% width on desktop) - Hidden on mobile */}
                    <View
                      style={Platform.OS === 'web' ? { width: '15%', flexShrink: 0 } : undefined}
                      className="hidden md:flex flex-row justify-center items-center"
                    >
                      {guest.linkedinUrl ? (
                        <a
                          href={guest.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Ionicons name="logo-linkedin" size={14} />
                        </a>
                      ) : (
                        <Text className="text-xs font-bold text-slate-300">—</Text>
                      )}
                    </View>

                    {/* Status Column (20% width on desktop) */}
                    <View
                      style={Platform.OS === 'web' ? { width: '20%', flexShrink: 0 } : undefined}
                      className="flex-row justify-end items-center gap-3"
                    >
                      {/* Status Badges with Custom Status Colors */}
                      <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full shrink-0 ${statusBgClass}`}>
                        <View className={`h-1.5 w-1.5 rounded-full ${
                          status === "arrived" ? "bg-emerald-500" :
                          status === "unarrived" ? "bg-blue-500" : "bg-amber-500"
                        }`} />
                        <Text className={`text-[11px] font-extrabold tracking-wide uppercase shrink-0 ${statusColorClass}`}>
                          {statusText}
                        </Text>
                      </View>
                    </View>

                  </View>
                );
              })}
            </View>
          )}

        </View>

        {/* Footer */}
        <View className="flex-col gap-3 border-t border-slate-200 py-8 mt-12 md:flex-row md:items-center md:justify-between">
          <Text className="text-sm font-medium text-slate-500">
            © 2026 Gryphon Academy. All rights reserved.
          </Text>
          <View className="flex-row gap-5">
            <Link href="/privacy-policy" asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Privacy Policy
              </Text>
            </Link>
            <Link href="/terms-and-conditions" asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Terms
              </Text>
            </Link>
            <Link href={supportHref} asChild>
              <Text className="text-sm font-semibold text-slate-600">
                Support
              </Text>
            </Link>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
