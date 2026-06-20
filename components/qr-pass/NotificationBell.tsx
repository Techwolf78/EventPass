import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface NotificationBellProps {
  permissionStatus: "granted" | "denied" | "undetermined" | null;
  onPress: () => void;
  themeColor: string;
  themeSoftBg: string;
  themeBorderColor: string;
}

export default function NotificationBell({
  permissionStatus,
  onPress,
  themeColor,
  themeSoftBg,
  themeBorderColor,
}: NotificationBellProps) {
  const isEnabled = permissionStatus === "granted";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: themeSoftBg,
          borderColor: themeBorderColor,
        },
      ]}
    >
      <Ionicons
        name={isEnabled ? "notifications" : "notifications-outline"}
        size={22}
        color={themeColor}
      />
      {!isEnabled && <View style={styles.badge} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444", // Warning red dot
    borderWidth: 1.5,
    borderColor: "#FFFFFF", // White border separator for premium iOS look
  },
});
