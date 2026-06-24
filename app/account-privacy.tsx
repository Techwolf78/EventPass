import { useAuth } from "@/context/AuthContext";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AccountPrivacy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, guestSession } = useAuth();
  const { palette } = useAttendeeTheme();

  const activeEmail = user?.email || guestSession?.email || "Guest Account";
  const themeColor = palette?.primary || "#4f46e5";

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          paddingHorizontal: 16,
          paddingBottom: 8,
          paddingTop: insets.top > 0 ? insets.top + 4 : 12,
          backgroundColor: "#ffffff",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={themeColor} />
        </TouchableOpacity>

        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: "#0f172a",
              letterSpacing: -0.25,
            }}
          >
            Account & Privacy
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#64748b",
              marginTop: 1,
            }}
          >
            {activeEmail}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Settings Group */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {/* Privacy Policy */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f8fafc",
            }}
            onPress={() => router.push("/privacy-policy")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#eff6ff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="document-text-outline" size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1e293b" }}>
                  Privacy Policy
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
                  Read our privacy guidelines
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Terms and Conditions */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f8fafc",
            }}
            onPress={() => router.push("/terms-and-conditions")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#f5f3ff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#7c3aed" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1e293b" }}>
                  Terms & Conditions
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
                  View usage rules & agreements
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
            }}
            onPress={() => router.push("/delete-account")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#fef2f2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#ef4444" }}>
                  Delete Account
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#94a3b8", marginTop: 2 }}>
                  Permanently delete account data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fca5a5" />
          </TouchableOpacity>
        </View>

        <Text
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#94a3b8",
            marginTop: 12,
          }}
        >
          Your privacy settings are securely managed.
        </Text>
      </ScrollView>
    </View>
  );
}
