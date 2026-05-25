import { useAuth } from "@/context/AuthContext";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";
import {
  EventData,
  getEventAgenda,
  getMasterclassAgenda,
} from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper to parse time string to minutes (e.g., "10:00 AM" -> 600)
const parseTimeToMinutes = (timeStr: string): number => {
  try {
    const [time, modifier] = timeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch (e) {
    return 0;
  }
};

export default function AgendaScreen() {
  const { qrToken } = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    palette,
    enrollmentType: resolvedEnrollmentType,
    loading: themeLoading,
  } = useAttendeeTheme(qrToken as string);
  const [agenda, setAgenda] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadAgenda = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        if (resolvedEnrollmentType === "masterclass") {
          const masterclassAgenda = await getMasterclassAgenda();
          setAgenda(masterclassAgenda);
        } else {
          const eventAgenda = await getEventAgenda();
          setAgenda(eventAgenda);
        }
      } catch (error) {
        console.error("Error loading agenda:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolvedEnrollmentType],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAgenda(true);
  }, [loadAgenda]);

  useEffect(() => {
    if (!themeLoading) {
      loadAgenda();
    }
  }, [loadAgenda, themeLoading]);

  // Update current time every minute to refresh "Happening Now" status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get actual current time in minutes from state
  const actualCurrentMinutes =
    currentTime.getHours() * 60 + currentTime.getMinutes();

  const getSessionStatus = (timeStr: string) => {
    const minutes = parseTimeToMinutes(timeStr);
    if (!minutes) return "upcoming";

    const duration = 60; // Assume 1 hour

    if (
      actualCurrentMinutes >= minutes &&
      actualCurrentMinutes < minutes + duration
    ) {
      return "live";
    } else if (actualCurrentMinutes >= minutes + duration) {
      return "completed";
    } else {
      return "upcoming";
    }
  };

  if (loading || themeLoading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color={palette.primary} />
        <Text
          style={{ color: palette.primary }}
          className="font-semibold mt-4 text-sm uppercase tracking-wider"
        >
          Loading Agenda...
        </Text>
      </View>
    );
  }

  const isMasterclass = resolvedEnrollmentType === "masterclass";
  const displayTitle = isMasterclass ? "MASTERCLASS 3.0" : "SYNERGY SPHERE 3.0";
  const displayDate = "June 27, 2026";
  const displayLocation = "Ritz-Carlton, Pune";

  const agendaItems = agenda?.agenda || [];

  if (!agenda || agendaItems.length === 0) {
    return (
      <View className="flex-1 bg-slate-50">
        <View
          style={{ paddingTop: insets.top + 60 }}
          className="flex-1 items-center px-10"
        >
          <View className="w-24 h-24 rounded-full bg-white shadow-sm items-center justify-center mb-6 border border-slate-100">
            <Ionicons
              name="calendar-outline"
              size={40}
              color={palette.primary}
            />
          </View>
          <Text className="text-2xl font-bold text-slate-900 mb-2">
            No Agenda Scheduled
          </Text>
          <Text className="text-sm text-slate-500 text-center font-medium leading-relaxed mb-6">
            There is no schedule available for {displayTitle} yet. Please check
            back later or contact support.
          </Text>
          <TouchableOpacity
            onPress={() => loadAgenda()}
            className="px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm"
          >
            <Text className="text-slate-700 font-semibold text-sm">
              Refresh Schedule
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const liveSession = agendaItems.find(
    (item) => getSessionStatus(item.time) === "live",
  );

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 120,
        }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
          />
        }
      >
        {/* Hero Header */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between items-start mb-2">
            <Text
              style={{ color: palette.primary }}
              className="text-xs font-bold uppercase tracking-[2px]"
            >
              {displayDate}
            </Text>
            {liveSession && (
              <View className="flex-row items-center bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                <View className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5" />
                <Text className="text-red-600 text-[10px] font-bold uppercase">
                  Live Now
                </Text>
              </View>
            )}
          </View>
          <Text className="text-3xl font-bold text-slate-900 leading-tight mb-2">
            {displayTitle}
          </Text>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location" size={14} color="#64748B" />
            <Text className="text-sm font-medium text-slate-500">
              {displayLocation}
            </Text>
          </View>
        </View>

        {/* Happening Now Section */}
        {liveSession && (
          <View className="px-6 mb-8">
            <Text className="text-sm font-bold text-slate-900 mb-3">
              Happening Now
            </Text>
            <View className="bg-white rounded-2xl p-5 border-2 border-indigo-500 shadow-sm">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-xs font-bold text-indigo-600">
                  {liveSession.time}
                </Text>
                <View className="bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  <Text className="text-indigo-700 text-[10px] font-bold uppercase">
                    {liveSession.tag || "Session"}
                  </Text>
                </View>
              </View>
              <Text className="text-lg font-bold text-slate-900 mb-2">
                {liveSession.title}
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="person-circle" size={16} color="#64748B" />
                <Text className="text-sm font-medium text-slate-600 ml-1.5">
                  {liveSession.speaker}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Timeline Section */}
        <View className="px-6">
          <Text className="text-sm font-bold text-slate-900 mb-6">
            Full Schedule
          </Text>

          {agendaItems.map((item, index) => {
            const status = getSessionStatus(item.time);
            const isLive = status === "live";
            const isCompleted = status === "completed";
            const isLast = index === agendaItems.length - 1;

            return (
              <View key={index} className="flex-row min-h-[100px]">
                {/* Time & Indicator Column */}
                <View className="w-16 items-center">
                  <Text
                    className={`text-xs font-bold ${isLive ? "text-indigo-600" : isCompleted ? "text-slate-400" : "text-slate-900"} mb-2`}
                  >
                    {item.time}
                  </Text>
                  <View
                    className={`w-[2px] ${isCompleted ? "bg-indigo-100" : "bg-slate-100"} flex-1 mb-2`}
                  />
                  <View
                    className={`w-3 h-3 rounded-full absolute top-5 ${
                      isLive
                        ? "bg-indigo-600 border-2 border-white shadow-sm"
                        : isCompleted
                          ? "bg-slate-300"
                          : "bg-white border-2 border-slate-300"
                    }`}
                  />
                </View>

                {/* Content Card Column */}
                <View className="flex-1 pb-6 ml-2">
                  <View
                    className={`bg-white rounded-2xl p-5 border ${isLive ? "border-indigo-200 shadow-sm" : "border-slate-100"} ${isCompleted ? "opacity-60" : ""}`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text
                        className={`flex-1 text-base font-bold text-slate-900 mr-2 leading-tight ${isCompleted ? "text-slate-500" : ""}`}
                      >
                        {item.title}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-md border ${
                          isLive
                            ? "bg-indigo-50 border-indigo-100"
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold uppercase tracking-wide ${
                            isLive ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
                          {item.tag || "Regular"}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="person-circle"
                          size={14}
                          color={isLive ? palette.primary : "#64748B"}
                        />
                        <Text
                          className={`text-xs font-medium ml-1.5 ${
                            isLive ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
                          {item.speaker}
                        </Text>
                      </View>

                      {isLive && (
                        <View className="flex-row items-center">
                          <View className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1" />
                          <Text className="text-red-600 text-[10px] font-bold uppercase">
                            Happening
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
