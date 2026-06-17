import React, { useEffect } from "react";
import { ScrollView, View, TouchableOpacity, StatusBar, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Privacy Policy page LOADED`);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Minimal Header */}
      <View 
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: insets.top > 0 ? insets.top + 8 : 20,
          backgroundColor: "#ffffff",
        }}
      >
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ marginRight: 16 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        
        <Text 
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#0f172a",
          }}
        >
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: 24, 
          paddingTop: 32, 
          paddingBottom: insets.bottom + 40,
          maxWidth: 800,
          width: "100%",
          alignSelf: "center"
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>Last Updated: May 19, 2026</Text>

        <View style={styles.divider} />

        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Gryphon Academy ("we," "us," "our," or "Company") is committed to protecting
            your privacy. This Privacy Policy explains how we collect, use,
            disclose, and otherwise process personal information in connection
            with our mobile application and services.
          </Text>

          <Text style={styles.heading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, including but not limited to:
          </Text>
          
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bulletBold}>Authentication:</Text> Email address, name, and credentials.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bulletBold}>Profile:</Text> Event registration and profile data.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bulletBold}>Event details:</Text> Guest lists and check-in records.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bulletBold}>Device data:</Text> System details and scan-camera access.
            </Text>
          </View>

          <Text style={styles.heading}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the collected details to verify registrations, enable smooth check-in scans, print attendees passes, issue certificates, and optimize the overall user experience.
          </Text>

          <Text style={styles.heading}>3. Firebase and Google Services</Text>
          <Text style={styles.paragraph}>
            Gryphon Academy uses Firebase for authentication, data storage, and push
            notifications. Your data is processed by Google according to their
            privacy policies at policies.google.com/privacy.
          </Text>

          <Text style={styles.heading}>4. Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information. We may share information
            with event administrators, service providers (Firebase, Google Cloud),
            and when required by law.
          </Text>

          <Text style={styles.heading}>5. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to request deletion of your account (available inside settings), update credentials, download certificates, or request support inquiry.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.contactHeading}>Contact Us</Text>
          <Text style={styles.contactParagraph}>
            For any questions regarding your data privacy, please contact our support desk:
          </Text>
          <Text style={styles.contactEmail}>
            synergysphere@gryphonacademy.co.in
          </Text>
        </View>

        <Text style={styles.copyright}>
          © 2026 Gryphon Academy. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 24,
  },
  content: {
    gap: 24,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
    letterSpacing: -0.1,
  },
  paragraph: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    fontWeight: "400",
  },
  bulletList: {
    gap: 8,
    paddingLeft: 4,
  },
  bulletItem: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    fontWeight: "400",
  },
  bulletBold: {
    fontWeight: "600",
    color: "#0f172a",
  },
  contactHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  contactParagraph: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
    marginTop: 4,
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
    marginTop: 8,
  },
  copyright: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 48,
  },
});
