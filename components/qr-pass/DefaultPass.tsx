import { useAuth } from "@/context/AuthContext";
import { getEnrollmentDisplayName } from "@/hooks/use-attendee-theme";
import {
  checkNotificationPermission,
  registerPushTokenForGuestOrUser,
  PermissionStatus,
} from "@/utils/notificationHelper";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import NotificationBell from "./NotificationBell";
import NotificationPermissionModal from "./NotificationPermissionModal";

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
  // Determine dynamic brand color scheme directly
  const themeColor = isMasterclass ? "#06b6d4" : "#ef4444";
  const themeSoftBg = isMasterclass ? "#ecfeff" : "#fee2e2";
  const themeBorderColor = isMasterclass ? "#c5f6fa" : "#fecaca";
  const themeTextColor = isMasterclass ? "#0891b2" : "#b91c1c";

  // Notification and Modal states
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  const { guestSession } = useAuth();

  const qrTokenToUse =
    candidate?.qrToken || guestSession?.qrToken || activeToken;
  const emailToUse = candidate?.email || guestSession?.email;
  const enrollmentTypeToUse =
    candidate?.enrollmentType || (isMasterclass ? "masterclass" : "event");

  const checkStatus = useCallback(async () => {
    const status = await checkNotificationPermission();
    setPermissionStatus(status);
    if (status === "granted") {
      await registerPushTokenForGuestOrUser(
        enrollmentTypeToUse,
        qrTokenToUse,
        emailToUse,
      );
    }
  }, [enrollmentTypeToUse, qrTokenToUse, emailToUse]);

  useEffect(() => {
    checkStatus();

    // Recheck permissions when app transitions back to the foreground
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


  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          backgroundColor: "#ffffff",
        }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColor}
          />
        }
      >
        {/* Header Block (Light Themed) */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "900",
                  color: "#0f172a",
                  letterSpacing: -0.5,
                  lineHeight: 28,
                }}
              >
                {eventName}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                  gap: 4,
                }}
              >
                <Ionicons name="location" size={14} color="#64748b" />
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}
                >
                  {eventLocation}
                </Text>
              </View>
            </View>

            {/* Header Right Actions */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Notification Bell */}
              <NotificationBell
                permissionStatus={permissionStatus}
                onPress={() => setModalVisible(true)}
                themeColor={themeColor}
                themeSoftBg={themeSoftBg}
                themeBorderColor={themeBorderColor}
              />

              {/* Event Icon/Badge */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: themeSoftBg,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: themeBorderColor,
                }}
              >
                <Ionicons name="ticket" size={22} color={themeColor} />
              </View>
            </View>
          </View>
        </View>

        {/* Pass Container Card */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            marginHorizontal: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.04,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          {/* QR Code Container */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderRadius: 20,
                padding: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <QRCode
                getRef={setQrRef}
                value={activeToken}
                size={qrSize}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Scan at Entrance
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "#f1f5f9",
              marginBottom: 24,
            }}
          />

          {/* Ticket Info Section */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "900",
                color: themeTextColor,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 16,
              }}
            >
              Attendee Pass
            </Text>

            {/* Profile Row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#f8fafc",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Ionicons name="person" size={20} color="#64748b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 17, fontWeight: "800", color: "#0f172a" }}
                  numberOfLines={1}
                >
                  {candidate?.name || "—"}
                </Text>
                <Text
                  style={{ fontSize: 13, color: "#64748b", marginTop: 1 }}
                  numberOfLines={1}
                >
                  {candidate?.email || "—"}
                </Text>
              </View>
            </View>

            {/* Attributes Grid (List structure with dividers) */}
            <View
              style={{
                borderRadius: 16,
                borderStyle: "solid",
                borderWidth: 1,
                borderColor: "#f1f5f9",
                overflow: "hidden",
              }}
            >
              {/* Row 1: Role */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#fafbfc",
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}
                >
                  Role
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}
                >
                  {candidate?.role || "Attendee"}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />

              {/* Row 2: Enrollment */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}
                >
                  Enrollment
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: themeTextColor,
                    textTransform: "capitalize",
                  }}
                >
                  {getEnrollmentDisplayName(candidate?.enrollmentType) || "—"}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />

              {/* Row 3: Company */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#fafbfc",
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}
                >
                  Company
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#334155" }}
                >
                  {candidate?.companyName || "—"}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />

              {/* Row 4: Pass ID */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}
                >
                  Pass ID
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: themeTextColor,
                    fontFamily: "monospace",
                  }}
                >
                  {uniqueId}
                </Text>
              </View>
            </View>
          </View>

          {/* View Agenda CTA Button */}
          <TouchableOpacity
            style={{
              backgroundColor: themeColor,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              shadowColor: themeColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleViewAgenda}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "bold" }}>
              View Agenda
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info text */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 24,
            paddingHorizontal: 40,
            lineHeight: 18,
          }}
        >
          Present this QR code at the entrance for check-in. This pass is valid
          for {eventName} on {eventDate}.
        </Text>
      </ScrollView>

      {/* Notification permission sheet */}
      <NotificationPermissionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        permissionStatus={permissionStatus}
        onPermissionUpdated={handlePermissionUpdated}
        enrollmentType={enrollmentTypeToUse}
        qrToken={qrTokenToUse}
        email={emailToUse}
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
});
