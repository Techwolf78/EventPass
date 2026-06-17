import React from "react";
import { ScrollView, View, TouchableOpacity, StatusBar, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function TermsAndConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          Terms & Conditions
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
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>Last Updated: May 19, 2026</Text>

        <View style={styles.divider} />

        <View style={styles.content}>
          <Text style={styles.paragraph}>
            By downloading, installing, and using Gryphon Academy, you agree to be bound
            by these Terms and Conditions. If you do not agree, please do not use
            this service.
          </Text>

          <Text style={styles.heading}>1. License Grant</Text>
          <Text style={styles.paragraph}>
            Gryphon Academy grants you a limited, non-exclusive license to use the
            Application for personal, non-commercial purposes. You may not modify,
            reverse engineer, or use the app for illegal purposes.
          </Text>

          <Text style={styles.heading}>2. User Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining confidentiality of your login
            credentials and all activities under your account. You represent that
            you are at least 13 years of age.
          </Text>

          <Text style={styles.heading}>3. Acceptable Use</Text>
          <Text style={styles.paragraph}>
            You agree not to use Gryphon Academy for transmitting malware, harassment,
            spamming, violating laws, or unauthorized access.
          </Text>

          <Text style={styles.heading}>4. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            GRYPHON ACADEMY IS PROVIDED ON AN "AS IS" BASIS. WE DISCLAIM ALL WARRANTIES.
            IN NO EVENT SHALL WE BE LIABLE FOR INDIRECT, SPECIAL, OR CONSEQUENTIAL
            DAMAGES.
          </Text>

          <Text style={styles.heading}>5. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate your account immediately if you violate these terms,
            engage in illegal activity, or compromise the app's integrity.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.contactHeading}>Contact Us</Text>
          <Text style={styles.contactParagraph}>
            For any questions regarding these Terms and Conditions, please contact our support desk:
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
