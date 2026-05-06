import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  getMasterclassAgenda,
  getEventAgenda,
  EventData,
} from "@/utils/firestore";
import { useAuth } from "@/context/AuthContext";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";

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

  const loadAgenda = useCallback(async () => {
    setLoading(true);
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
    }
  }, [resolvedEnrollmentType]);

  useEffect(() => {
    if (!themeLoading) {
      loadAgenda();
    }
  }, [loadAgenda, themeLoading]);

  if (loading || themeLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color={palette.primary} />
        <Text
          style={{ color: palette.primary }}
          className="font-semibold mt-4 text-sm uppercase tracking-wider"
        >
          Loading Agenda
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
      <View className="flex-1 bg-white">
        <View
          style={{ paddingTop: insets.top + 40 }}
          className="flex-1 items-center px-10"
        >
          <View className="w-20 h-20 rounded-full bg-slate-50 items-center justify-center mb-6">
            <Ionicons
              name="calendar-outline"
              size={32}
              color={palette.primarySoft}
            />
          </View>
          <Text className="text-xl font-black text-slate-900 mb-2">
            No Agenda Found
          </Text>
          <Text className="text-sm text-slate-400 text-center font-medium leading-relaxed">
            There is no schedule available for {displayTitle} yet. Please check
            back later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
        }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 mb-8">
          <Text
            style={{ color: palette.primary }}
            className="text-[11px] font-black uppercase tracking-[2px] mb-2"
          >
            {displayDate}
          </Text>
          <Text className="text-3xl font-black text-slate-900 leading-tight mb-2">
            {displayTitle}
          </Text>
          <View className="flex-row items-center gap-2">
            <Ionicons name="location" size={14} color={palette.primary} />
            <Text className="text-sm font-semibold text-slate-500">
              {displayLocation}
            </Text>
          </View>
        </View>

        <View className="px-6">
          <Text
            style={{ color: palette.primary }}
            className="text-xs font-black uppercase tracking-[1px] mb-6"
          >
            Event Schedule
          </Text>

          {agendaItems.map((item, index) => (
            <View key={index} className="flex-row mb-8">
              {/* Timeline */}
              <View className="items-center mr-4 w-12">
                <Text className="text-xs font-black text-slate-900 uppercase">
                  {item.time}
                </Text>
                <View className="w-[2px] bg-slate-100 flex-1 my-2" />
              </View>

              {/* Content */}
              <View className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="flex-1 text-base font-black text-slate-900 mr-2 leading-tight">
                    {item.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        item.tag?.toLowerCase() === "technical"
                          ? palette.primarySoft
                          : palette.primaryBorder,
                      borderColor:
                        item.tag?.toLowerCase() === "technical"
                          ? palette.primaryBorder
                          : palette.primarySoft,
                      borderWidth: 1,
                    }}
                    className="px-2 py-0.5 rounded-md"
                  >
                    <Text
                      style={{
                        color: palette.primaryText,
                      }}
                      className="text-[10px] font-black uppercase tracking-tighter"
                    >
                      {item.tag || "Regular"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Ionicons
                    name="person-circle"
                    size={14}
                    color={palette.primary}
                  />
                  <Text
                    style={{ color: palette.primaryText }}
                    className="text-xs font-bold ml-1"
                  >
                    {item.speaker}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
