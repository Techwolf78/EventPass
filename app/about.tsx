import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AboutGryphonAcademy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, guestSession } = useAuth();

  const activeEmail = user?.email || guestSession?.email || "Guest Account";

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar barStyle="dark-content" />

      {/* Fixed Light Theme Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top > 0 ? insets.top + 8 : 20,
          backgroundColor: "#ffffff",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#4f46e5" />
        </TouchableOpacity>

        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#0f172a",
            }}
          >
            About Gryphon Academy
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

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: insets.bottom + 20,
          backgroundColor: "#ffffff",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Information Block */}
        <View style={{ alignItems: "center" }}>
          {/* Logo Badge */}
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Image
              source={require("@/assets/images/connecthq-square.png")}
              style={{ width: 112, height: 112 }}
              resizeMode="cover"
            />
          </View>

          {/* App Name */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "900",
              color: "#0f172a",
              marginTop: 24,
              letterSpacing: -0.5,
            }}
          >
            Gryphon Academy
          </Text>

          {/* Version */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#94a3b8",
              marginTop: 4,
            }}
          >
            V{Constants.expoConfig?.version ?? "1.0.5"}
          </Text>

          {/* Legal / Provider details */}
          <View
            style={{
              alignItems: "center",
              marginTop: 40,
              paddingHorizontal: 24,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#64748b",
                textAlign: "center",
                lineHeight: 18,
              }}
            >
              Published by Gryphon Academy Pvt. Ltd.
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#94a3b8",
                textAlign: "center",
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              © 2026 Gryphon Academy. All rights reserved.
            </Text>
          </View>
        </View>

        {/* Action Buttons Block (Privacy & Terms) */}
        <View style={{ marginTop: 40, width: "100%" }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/privacy-policy")}
            style={{
              borderWidth: 1,
              borderColor: "#4f46e5",
              borderRadius: 9999,
              paddingVertical: 14,
              paddingHorizontal: 24,
              marginBottom: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#ffffff",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#4f46e5" }}>
              Privacy policy
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/terms-and-conditions")}
            style={{
              borderWidth: 1,
              borderColor: "#4f46e5",
              borderRadius: 9999,
              paddingVertical: 14,
              paddingHorizontal: 24,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#ffffff",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#4f46e5" }}>
              Terms & Conditions
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
