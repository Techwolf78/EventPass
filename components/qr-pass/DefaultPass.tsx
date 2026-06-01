import { getEnrollmentDisplayName } from "@/hooks/use-attendee-theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

export interface DefaultPassProps {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  brandBg: string;
  brandText: string;
  brandShadow: string;
  insets: { top: number; bottom: number };
  activeToken: string;
  qrSize: number;
  candidate: any;
  uniqueId: string;
  refreshing: boolean;
  onRefresh: () => void;
  handleViewAgenda: () => void;
  setQrRef: (ref: any) => void;
  isMasterclass?: boolean;
}

export default function DefaultPass({
  eventName,
  eventDate,
  eventLocation,
  brandBg,
  brandText,
  brandShadow,
  insets,
  activeToken,
  qrSize,
  candidate,
  uniqueId,
  refreshing,
  onRefresh,
  handleViewAgenda,
  setQrRef,
  isMasterclass = true,
}: DefaultPassProps) {
  // Teal/Cyan gradient for Masterclass, Premium Dark Ruby gradient for Synergy Sphere
  const gradientColors = isMasterclass
    ? (["#0f172a", "#0d9488", "#14b8a6", "#06b6d4"] as const)
    : (["#090514", "#1a0826", "#4c0519", "#881337", "#dc2626"] as const);

  const bannerContent = (
    <View className="flex-row justify-between items-center px-6">
      <View className="flex-1">
        <Text className="text-3xl font-bold text-white mb-2 leading-tight tracking-tight">
          {eventName}
        </Text>
        <View className="flex-row items-center mb-1 gap-2">
          <Ionicons
            name="calendar-outline"
            size={14}
            color="rgba(255,255,255,0.85)"
          />
          <Text className="text-sm text-white/85 font-medium">{eventDate}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="location-outline"
            size={14}
            color="rgba(255,255,255,0.85)"
          />
          <Text className="text-sm text-white/85 font-medium" numberOfLines={1}>
            {eventLocation}
          </Text>
        </View>
      </View>
      <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
        <Ionicons name="ticket-outline" size={24} color="#fff" />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Event Banner */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 24,
            paddingBottom: 60,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          {bannerContent}
        </LinearGradient>

        {/* Main Floating Card */}
        <View
          className="bg-white rounded-3xl mx-5 -mt-10 p-6 shadow-xl shadow-slate-200 border border-slate-100"
          style={{ borderRadius: 24 }}
        >
          {/* QR Section */}
          <View className="items-center mb-6">
            <View
              className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 shadow-inner"
              style={{ borderRadius: 20 }}
            >
              <QRCode
                getRef={setQrRef}
                value={activeToken}
                size={qrSize}
                color="#0F172A" // Obsidian
                backgroundColor="#fff"
              />
            </View>
            <Text className="text-xs text-slate-400 font-bold tracking-widest uppercase">
              Scan at Entrance
            </Text>
          </View>

          <View className="h-[1px] bg-slate-100 mb-6" />

          {/* Attendee Details */}
          <View className="mb-6">
            <Text
              className={`text-xs font-bold ${brandText} uppercase tracking-wider mb-4`}
            >
              Attendee Pass
            </Text>

            {/* Profile Row */}
            <View className="flex-row items-center mb-5">
              <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center mr-4">
                <Ionicons name="person" size={24} color="#64748B" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {candidate?.name || "—"}
                </Text>
                <Text className="text-sm text-slate-500" numberOfLines={1}>
                  {candidate?.email || "—"}
                </Text>
              </View>
            </View>

            <View className="flex-row mb-4 gap-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-tight">
                  Role
                </Text>
                <Text className="text-sm font-semibold text-slate-800">
                  {candidate?.role || "Attendee"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-tight">
                  Enrollment
                </Text>
                <Text className="text-sm font-semibold text-slate-800 capitalize">
                  {getEnrollmentDisplayName(candidate?.enrollmentType) || "—"}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-tight">
                  Company
                </Text>
                <Text className="text-sm font-semibold text-slate-800 capitalize">
                  {candidate?.companyName || "—"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-tight">
                  Pass ID
                </Text>
                <Text
                  className={`text-sm font-bold ${brandText} font-mono`}
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
            style={{ borderRadius: 14 }}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text className="text-white text-base font-bold ml-2">
              View Agenda
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-center text-xs text-slate-400 mt-6 font-medium px-10 leading-relaxed">
          Present this QR code at the entrance for check-in. This pass is valid
          for {eventName}.
        </Text>
      </ScrollView>
    </View>
  );
}
