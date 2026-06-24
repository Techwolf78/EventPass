import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={async () => {
        await logout();
        router.replace("/(auth)/login");
      }}
      activeOpacity={0.7}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginRight: 8,
      }}
    >
      <Ionicons name="log-out-outline" size={18} color="#000000" />
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: "",
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#9CA3AF",
        headerStyle: {
          backgroundColor: "transparent",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height:
            Platform.OS === "ios"
              ? 90
              : 75 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingTop: 8,
          paddingBottom:
            Platform.OS === "ios"
              ? insets.bottom
              : insets.bottom > 0
                ? insets.bottom
                : 10,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          alignSelf: "center",
          shadowColor: "#000",
          ...Platform.select({
            web: {
              boxShadow: "0 -4px 10px rgba(0,0,0,0.05)",
            },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 5,
            },
          }),
          elevation: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
          paddingHorizontal: 2,
          width: "100%",
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          headerRight: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="panel"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          title: "Guests",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
