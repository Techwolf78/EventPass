import {
  registerPushTokenForGuestOrUser,
  requestNotificationPermission,
} from "@/utils/notificationHelper";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  permissionStatus: "granted" | "denied" | "undetermined" | null;
  onPermissionUpdated: (
    status: "granted" | "denied" | "undetermined",
    toastMsg: string,
  ) => void;
  enrollmentType: string;
  qrToken?: string | null;
  email?: string | null;
}

export default function NotificationPermissionModal({
  visible,
  onClose,
  permissionStatus,
  onPermissionUpdated,
  enrollmentType,
  qrToken,
  email,
}: NotificationPermissionModalProps) {
  const [requesting, setRequesting] = useState(false);
  const isEnabled = permissionStatus === "granted";

  const handleEnableNotifications = async () => {
    setRequesting(true);
    try {
      // 1. Request permission
      const granted = await requestNotificationPermission();

      if (granted) {
        // 2. Register push token in backend/Firestore
        const registration = await registerPushTokenForGuestOrUser(
          enrollmentType || "attendee",
          qrToken,
          email,
        );

        if (registration.success) {
          const msg = registration.isMock
            ? "Notifications enabled successfully (Simulator simulation)."
            : "Notifications enabled successfully.";
          onPermissionUpdated("granted", msg);
        } else {
          onPermissionUpdated("granted", "Notifications registered on device, but database sync failed.");
        }
      } else {
        onPermissionUpdated(
          "denied",
          "Notification permission was denied. You can enable it later from device settings.",
        );
      }
    } catch (error) {
      console.error("[NotificationPermissionModal] Enable error:", error);
      onPermissionUpdated(
        "denied",
        "Failed to request notifications. Check device settings.",
      );
    } finally {
      setRequesting(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap Target */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContent}>
          {/* iOS Indicator Bar */}
          <View style={styles.handle} />

          {/* Header Row */}
          <View style={styles.closeHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Icon Area */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconWrapper,
                isEnabled ? styles.iconWrapperSuccess : styles.iconWrapperPending,
              ]}
            >
              <Ionicons
                name={isEnabled ? "notifications-circle" : "notifications"}
                size={44}
                color={isEnabled ? "#16A34A" : "#2563EB"}
              />
            </View>
          </View>

          {/* Content Area */}
          <View style={styles.body}>
            <Text style={styles.title}>
              {isEnabled ? "Notifications Enabled" : "Stay Updated"}
            </Text>
            <Text style={styles.message}>
              {isEnabled
                ? "You are all set! You will not miss any important alerts."
                : "You are missing out on the latest event updates."}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.benefitsTitle}>
              {isEnabled
                ? "You will receive updates for:"
                : "Enable notifications to receive:"}
            </Text>

            {/* Bullet Points */}
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-done" size={16} color="#16A34A" />
                <Text style={styles.bulletText}>Event reminders & countdowns</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-done" size={16} color="#16A34A" />
                <Text style={styles.bulletText}>Schedule & agenda changes</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-done" size={16} color="#16A34A" />
                <Text style={styles.bulletText}>Entry passes & scan alerts</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="checkmark-done" size={16} color="#16A34A" />
                <Text style={styles.bulletText}>Important announcements & admin updates</Text>
              </View>
            </View>
          </View>

          {/* Action Footer Buttons */}
          <View style={styles.footer}>
            {isEnabled ? (
              <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Great, thanks!</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleEnableNotifications}
                  disabled={requesting}
                >
                  {requesting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Enable Notifications
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  disabled={requesting}
                >
                  <Text style={styles.secondaryButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)", // Styled overlay backdrop
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#FFFFFF", // Modal background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB", // iOS grab handle
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 8,
  },
  closeHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeBtn: {
    padding: 4,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: 14,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperPending: {
    backgroundColor: "#EFF6FF", // Blue tint for pending request state
  },
  iconWrapperSuccess: {
    backgroundColor: "#ECFDF5", // Green tint for enabled state
  },
  body: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#01224E", // Premium Primary Color
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#6B7280", // Secondary text color
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB", // Border color
    width: "100%",
    marginVertical: 16,
  },
  benefitsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textTransform: "uppercase",
    alignSelf: "flex-start",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  bulletList: {
    width: "100%",
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  footer: {
    width: "100%",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#01224E", // Button Background
    height: 48,
    borderRadius: 14, // Curved style
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#01224E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#6B7280", // Maybe Later Style
    fontSize: 14,
    fontWeight: "600",
  },
});
