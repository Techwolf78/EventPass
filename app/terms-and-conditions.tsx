import React from "react";
import { ScrollView, View, TouchableOpacity, StatusBar, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";

export default function TermsAndConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, guestSession } = useAuth();
  const { palette } = useAttendeeTheme();

  const activeEmail = user?.email || guestSession?.email || "Guest Account";
  const themeColor = palette.primary;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View 
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          paddingHorizontal: 16,
          paddingBottom: 14,
          paddingTop: insets.top > 0 ? insets.top + 8 : 20,
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
            Terms & Conditions
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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Callout */}
        <View style={styles.dateCallout}>
          <Ionicons name="time-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
          <Text style={styles.dateCalloutText}>Last Updated: May 19, 2026</Text>
        </View>

        <View style={{ gap: 20 }}>
          {/* Section 1 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>01</Text>
              <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
            </View>
            <Text style={styles.sectionBody}>
              By downloading, installing, and using ConnectHQ, you agree to be bound
              by these Terms and Conditions. If you do not agree, please do not use
              this service.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>02</Text>
              <Text style={styles.sectionTitle}>License Grant</Text>
            </View>
            <Text style={styles.sectionBody}>
              ConnectHQ grants you a limited, non-exclusive license to use the
              Application for personal, non-commercial purposes. You may not modify,
              reverse engineer, or use the app for illegal purposes.
            </Text>
          </View>

          {/* Section 3 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>03</Text>
              <Text style={styles.sectionTitle}>User Accounts</Text>
            </View>
            <Text style={styles.sectionBody}>
              You are responsible for maintaining confidentiality of your login
              credentials and all activities under your account. You represent that
              you are at least 13 years of age.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>04</Text>
              <Text style={styles.sectionTitle}>Acceptable Use</Text>
            </View>
            <Text style={styles.sectionBody}>
              You agree not to use ConnectHQ for transmitting malware, harassment,
              spamming, violating laws, or unauthorized access.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>05</Text>
              <Text style={styles.sectionTitle}>Limitation of Liability</Text>
            </View>
            <Text style={styles.sectionBody}>
              CONNECTHQ IS PROVIDED ON AN "AS IS" BASIS. WE DISCLAIM ALL WARRANTIES.
              IN NO EVENT SHALL WE BE LIABLE FOR INDIRECT, SPECIAL, OR CONSEQUENTIAL
              DAMAGES.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>06</Text>
              <Text style={styles.sectionTitle}>Termination</Text>
            </View>
            <Text style={styles.sectionBody}>
              We may terminate your account immediately if you violate these terms,
              engage in illegal activity, or compromise the app's integrity.
            </Text>
          </View>

          {/* Contact Support */}
          <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
            <View style={styles.mailIconCircle}>
              <Ionicons name="mail" size={20} color={themeColor} />
            </View>
            <Text style={styles.mailSectionTitle}>
              Contact Us
            </Text>
            <Text style={styles.mailSubtitle}>
              For any questions regarding these Terms and Conditions:
            </Text>
            <Text style={[styles.mailAddress, { color: themeColor }]}>
              synergysphere@gryphonacademy.co.in
            </Text>
          </View>
        </View>

        <Text style={styles.copyrightText}>
          © 2026 ConnectHQ. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dateCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  dateCalloutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionNumber: {
    fontSize: 16,
    fontWeight: "900",
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  sectionBody: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
    fontWeight: "600",
  },
  mailIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  mailSectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mailSubtitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 8,
  },
  mailAddress: {
    fontSize: 15,
    fontWeight: "800",
  },
  copyrightText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 32,
    marginBottom: 10,
  },
});
