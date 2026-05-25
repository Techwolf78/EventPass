import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React, { useEffect } from "react";
import { ScrollView, useColorScheme } from "react-native";

export default function PrivacyPolicy() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    const loadTime = new Date().toLocaleTimeString();
    console.log(`[${loadTime}] ✅ Privacy Policy page LOADED`);

    // Set a timer to check if page stays loaded (no redirect)
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
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f9fafb" }}
    >
      <ThemedView style={{ padding: 20 }}>
        <ThemedText type="title" style={{ fontSize: 28, marginBottom: 10 }}>
          Privacy Policy
        </ThemedText>
        <ThemedText style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
          Last Updated: May 19, 2026
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          1. Introduction
        </ThemedText>
        <ThemedText>
          ConnectHQ ("we," "us," "our," or "Company") is committed to protecting
          your privacy. This Privacy Policy explains how we collect, use,
          disclose, and otherwise process personal information in connection
          with our mobile application and services.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          2. Information We Collect
        </ThemedText>
        <ThemedText>
          We collect information you provide directly to us, such as:
        </ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          •{" "}
          <ThemedText style={{ fontWeight: "bold" }}>
            Authentication Information:
          </ThemedText>{" "}
          Email address, name, and account credentials{"\n"}•{" "}
          <ThemedText style={{ fontWeight: "bold" }}>
            Profile Information:
          </ThemedText>{" "}
          Information you provide in your user profile{"\n"}•{" "}
          <ThemedText style={{ fontWeight: "bold" }}>Event Data:</ThemedText>{" "}
          Information related to events, guest lists, and attendance records
          {"\n"}•{" "}
          <ThemedText style={{ fontWeight: "bold" }}>
            Device Information:
          </ThemedText>{" "}
          Device identifiers, device type, operating system{"\n"}•{" "}
          <ThemedText style={{ fontWeight: "bold" }}>Camera Access:</ThemedText>{" "}
          Information related to QR code scanning
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          3. How We Use Your Information
        </ThemedText>
        <ThemedText>We use the information we collect to:</ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          • Provide and improve our services{"\n"}• Authenticate users and
          prevent fraud{"\n"}• Enable QR code scanning and attendee check-in
          features{"\n"}• Send notifications about events and check-ins{"\n"}•
          Generate event certificates and reports
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          4. Firebase and Google Services
        </ThemedText>
        <ThemedText>
          ConnectHQ uses Firebase for authentication, data storage, and push
          notifications. Your data is processed by Google according to their
          privacy policies at policies.google.com/privacy and
          firebase.google.com/support/privacy
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          5. Data Sharing
        </ThemedText>
        <ThemedText>
          We do not sell your personal information. We may share information
          with event administrators, service providers (Firebase, Google Cloud),
          and when required by law.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          6. Your Rights
        </ThemedText>
        <ThemedText>
          You may have the right to access, correct, delete your data, opt out
          of communications, and request data portability depending on your
          location.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          7. Contact Us
        </ThemedText>
        <ThemedText>
          For questions about this Privacy Policy:{"\n"}
          Email: synergysphere@gryphonacademy.co.in
        </ThemedText>

        <ThemedText
          style={{
            fontSize: 12,
            color: "#666",
            marginTop: 40,
            marginBottom: 20,
          }}
        >
          © 2026 ConnectHQ. All rights reserved.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}
