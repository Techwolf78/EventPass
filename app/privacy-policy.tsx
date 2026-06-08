import React, { useEffect } from "react";
import { ScrollView, View, TouchableOpacity, StatusBar, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useAttendeeTheme } from "@/hooks/use-attendee-theme";

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, guestSession } = useAuth();
  const { palette } = useAttendeeTheme();

  const activeEmail = user?.email || guestSession?.email || "Guest Account";
  const themeColor = palette.primary;

  useEffect(() => {
    const loadTime = new Date().toLocaleTimeString();
    console.log(`[${loadTime}] ✅ Privacy Policy page LOADED`);

    const checkTimer = setTimeout(() => {
      const checkTime = new Date().toLocaleTimeString();
      console.log(
        `[${checkTime}] ✅ Still on Privacy Policy after 3 seconds (NO REDIRECT)`,
      );
    }, 3000);

    return () => {
      clearTimeout(checkTimer);
      const unloadTime = new Date().toLocaleTimeString();
      console.log(
        `[${unloadTime}] ❌ REDIRECTED away from Privacy Policy page`,
      );
    };
  }, []);

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
            Privacy Policy
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
              <Text style={styles.sectionTitle}>Introduction</Text>
            </View>
            <Text style={styles.sectionBody}>
              ConnectHQ ("we," "us," "our," or "Company") is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use,
              disclose, and otherwise process personal information in connection
              with our mobile application and services.
            </Text>
          </View>

          {/* Section 2 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>02</Text>
              <Text style={styles.sectionTitle}>Information We Collect</Text>
            </View>
            <Text style={styles.sectionBody}>
              We collect information you provide directly to us, such as:
            </Text>
            
            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={styles.bulletRow}>
                <Ionicons name="person-outline" size={16} color={themeColor} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "800", color: "#1e293b" }}>Authentication:</Text> Email address, name, and credentials
                </Text>
              </View>

              <View style={styles.bulletRow}>
                <Ionicons name="card-outline" size={16} color={themeColor} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "800", color: "#1e293b" }}>Profile:</Text> Event registration and profile data
                </Text>
              </View>

              <View style={styles.bulletRow}>
                <Ionicons name="calendar-outline" size={16} color={themeColor} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "800", color: "#1e293b" }}>Event details:</Text> Guest lists and check-in records
                </Text>
              </View>

              <View style={styles.bulletRow}>
                <Ionicons name="phone-portrait-outline" size={16} color={themeColor} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "800", color: "#1e293b" }}>Device data:</Text> System details and scan-camera access
                </Text>
              </View>
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>03</Text>
              <Text style={styles.sectionTitle}>How We Use Your Information</Text>
            </View>
            <Text style={styles.sectionBody}>
              We use the collected details to verify registrations, enable smooth check-in scans, print attendees passes, issues certificates, and optimize user experience.
            </Text>
          </View>

          {/* Section 4 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>04</Text>
              <Text style={styles.sectionTitle}>Firebase and Google Services</Text>
            </View>
            <Text style={styles.sectionBody}>
              ConnectHQ uses Firebase for authentication, data storage, and push
              notifications. Your data is processed by Google according to their
              privacy policies at policies.google.com/privacy.
            </Text>
          </View>

          {/* Section 5 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>05</Text>
              <Text style={styles.sectionTitle}>Data Sharing</Text>
            </View>
            <Text style={styles.sectionBody}>
              We do not sell your personal information. We may share information
              with event administrators, service providers (Firebase, Google Cloud),
              and when required by law.
            </Text>
          </View>

          {/* Section 6 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionNumber, { color: themeColor }]}>06</Text>
              <Text style={styles.sectionTitle}>Your Rights</Text>
            </View>
            <Text style={styles.sectionBody}>
              You have the right to request deletion of your account (available inside settings), update credentials, download certificates, or request support inquiry.
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
              For any questions regarding your data privacy:
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
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulletIcon: {
    marginRight: 10,
  },
  bulletText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
    flex: 1,
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
