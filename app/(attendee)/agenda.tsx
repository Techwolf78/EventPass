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
  StatusBar,
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
      <View style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text
          style={{ color: palette.primary, fontWeight: "700", marginTop: 16, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}
        >
          Loading Agenda...
        </Text>
      </View>
    );
  }

  const isMasterclass = resolvedEnrollmentType === "masterclass";
  const displayTitle = isMasterclass ? "Event Pass" : "SYNERGY SPHERE 2.0";
  const displayDate = "June 27, 2026";
  const displayLocation = "Ritz-Carlton, Pune";

  const agendaItems = agenda?.agenda || [];

  const liveSession = agendaItems.find(
    (item) => getSessionStatus(item.time) === "live"
  );

  if (!agenda || agendaItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View
          style={{ paddingTop: insets.top + 60, flex: 1, alignItems: "center", paddingHorizontal: 40 }}
        >
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <Ionicons
              name="calendar-outline"
              size={40}
              color={palette.primary}
            />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#0f172a", marginBottom: 8 }}>
            No Agenda Scheduled
          </Text>
          <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
            There is no schedule available for {displayTitle} yet. Please check
            back later or contact support.
          </Text>
          <TouchableOpacity
            onPress={() => loadAgenda()}
            style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14 }}
          >
            <Text style={{ color: "#334155", fontWeight: "700", fontSize: 14 }}>
              Refresh Schedule
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 120,
          backgroundColor: "#ffffff",
        }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
          />
        }
      >
        {/* Premium Calendar Hero Header */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32, marginTop: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text 
                style={{ 
                  fontSize: 22, 
                  fontWeight: "900", 
                  color: "#0f172a", 
                  letterSpacing: -0.5, 
                  lineHeight: 28 
                }}
              >
                {displayTitle}
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
                <Ionicons name="location" size={14} color="#64748b" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>
                  {displayLocation}
                </Text>
              </View>
            </View>
            
            {/* Elegant Calendar Badge */}
            <View 
              style={{
                backgroundColor: palette.primarySoft,
                borderColor: palette.primaryBorder,
                borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: palette.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: "800", color: palette.primaryText, letterSpacing: 1, textTransform: "uppercase" }}>
                June
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: palette.primaryText, marginTop: -2, lineHeight: 18 }}>
                27
              </Text>
            </View>
          </View>
        </View>

        {/* Happening Now Section */}
        {liveSession && (
          <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: palette.primary, letterSpacing: 1.2, textTransform: "uppercase" }}>
                Happening Now
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                <View style={{ width: 6, height: 6, backgroundColor: "#ef4444", borderRadius: 3, marginRight: 4 }} />
                <Text style={{ color: "#ef4444", fontSize: 9, fontWeight: "800", textTransform: "uppercase" }}>
                  Live
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: palette.primarySoft,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: palette.primary,
                padding: 20,
                shadowColor: palette.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              {/* Top Header of the live card */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: palette.primaryText }}>
                  {liveSession.time}
                </Text>
                <View 
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: palette.primaryBorder,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "800", textTransform: "uppercase", color: palette.primaryText }}>
                    {liveSession.tag || "Session"}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#0f172a", lineHeight: 24, marginBottom: 14 }}>
                {liveSession.title}
              </Text>

              {/* Footer info (Speaker) */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View 
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: palette.primaryBorder,
                  }}
                >
                  <Ionicons name="mic" size={14} color={palette.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Speaker
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: palette.primaryText, marginTop: 1 }}>
                    {liveSession.speaker}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Timeline Section */}
        <View style={{ paddingHorizontal: 20 }}>
          {agendaItems.map((item, index) => {
            const status = getSessionStatus(item.time);
            const isLive = status === "live";
            const isCompleted = status === "completed";
            const isLast = index === agendaItems.length - 1;

            return (
              <View key={index} style={{ flexDirection: "row", minHeight: 110 }}>
                
                {/* Left Timeline Rails Column */}
                <View style={{ width: 36, alignItems: "center" }}>
                  {/* Vertical Rail Line */}
                  {!isLast && (
                    <View 
                      style={{ 
                        position: "absolute", 
                        left: 17, 
                        top: 24, 
                        bottom: -24, 
                        width: 2, 
                        backgroundColor: isCompleted ? palette.primarySoft : "#f1f5f9" 
                      }} 
                    />
                  )}

                  {/* Dynamic Status Indicator Dots */}
                  <View style={{ marginTop: 6, zIndex: 10 }}>
                    {isLive ? (
                      /* Glowing Live Indicator */
                      <View 
                        style={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: 10, 
                          backgroundColor: palette.primarySoft, 
                          alignItems: "center", 
                          justifyContent: "center" 
                        }}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.primary }} />
                      </View>
                    ) : isCompleted ? (
                      /* Satisfying Completed Green Checkmark Badge */
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    ) : (
                      /* Simple Clean Upcoming Ring */
                      <View 
                        style={{ 
                          width: 14, 
                          height: 14, 
                          borderRadius: 7, 
                          backgroundColor: "#ffffff", 
                          borderWidth: 2, 
                          borderColor: "#cbd5e1",
                          marginTop: 3,
                        }} 
                      />
                    )}
                  </View>
                </View>

                {/* Content Card Column */}
                <View style={{ flex: 1, paddingBottom: 24, paddingLeft: 8 }}>
                  <View
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 20,
                      borderWidth: isLive ? 1.5 : 1,
                      borderColor: isLive ? palette.primary : "#f1f5f9",
                      overflow: "hidden",
                      flexDirection: "row",
                      shadowColor: isLive ? palette.primary : "#0f172a",
                      shadowOffset: { width: 0, height: isLive ? 6 : 2 },
                      shadowOpacity: isLive ? 0.08 : 0.02,
                      shadowRadius: isLive ? 12 : 6,
                      elevation: isLive ? 4 : 1,
                      opacity: isCompleted ? 0.75 : 1,
                    }}
                  >
                    {/* Left Accent Color Band Strip */}
                    <View 
                      style={{ 
                        width: 4, 
                        backgroundColor: isLive ? palette.primary : isCompleted ? "#10b981" : "#cbd5e1" 
                      }} 
                    />

                    {/* Card Inner Contents */}
                    <View style={{ flex: 1, padding: 16 }}>
                      {/* Top Time and Tag bar */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <Text 
                          style={{ 
                            fontSize: 12, 
                            fontWeight: "800", 
                            color: isLive ? palette.primary : "#64748b",
                          }}
                        >
                          {item.time}
                        </Text>
                        
                        {/* Event Category Tag */}
                        <View 
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: isLive ? palette.primarySoft : "#f1f5f9",
                            borderWidth: 1,
                            borderColor: isLive ? palette.primaryBorder : "#e2e8f0",
                          }}
                        >
                          <Text 
                            style={{ 
                              fontSize: 9, 
                              fontWeight: "800", 
                              textTransform: "uppercase",
                              color: isLive ? palette.primaryText : "#475569" 
                            }}
                          >
                            {item.tag || "Regular"}
                          </Text>
                        </View>
                      </View>

                      {/* Session Title */}
                      <Text 
                        style={{ 
                          fontSize: 16, 
                          fontWeight: "800", 
                          color: isCompleted ? "#64748b" : "#0f172a",
                          lineHeight: 22,
                          marginBottom: 10,
                        }}
                      >
                        {item.title}
                      </Text>

                      {/* Footer Details: Speaker and Live indicators */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons
                            name="mic-outline"
                            size={14}
                            color={isLive ? palette.primary : "#64748b"}
                          />
                          <Text 
                            style={{ 
                              fontSize: 12, 
                              fontWeight: "600", 
                              marginLeft: 4,
                              color: isLive ? palette.primary : "#475569" 
                            }}
                          >
                            {item.speaker}
                          </Text>
                        </View>

                        {/* Pulse Live Badge */}
                        {isLive && (
                          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <View style={{ width: 6, height: 6, backgroundColor: "#ef4444", borderRadius: 3, marginRight: 4 }} />
                            <Text style={{ color: "#ef4444", fontSize: 9, fontWeight: "800", textTransform: "uppercase" }}>
                              Live
                            </Text>
                          </View>
                        )}
                      </View>

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
