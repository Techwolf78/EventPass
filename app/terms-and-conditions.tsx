import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { ScrollView, useColorScheme } from "react-native";

export default function TermsAndConditions() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f9fafb" }}
    >
      <ThemedView style={{ padding: 20 }}>
        <ThemedText type="title" style={{ fontSize: 28, marginBottom: 10 }}>
          Terms and Conditions
        </ThemedText>
        <ThemedText style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
          Last Updated: May 19, 2026
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          1. Acceptance of Terms
        </ThemedText>
        <ThemedText>
          By downloading, installing, and using ConnectHQ, you agree to be bound
          by these Terms and Conditions. If you do not agree, please do not use
          this service.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          2. License Grant
        </ThemedText>
        <ThemedText>
          ConnectHQ grants you a limited, non-exclusive license to use the
          Application for personal, non-commercial purposes. You may not modify,
          reverse engineer, or use the app for illegal purposes.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          3. User Accounts
        </ThemedText>
        <ThemedText>
          You are responsible for maintaining confidentiality of your login
          credentials and all activities under your account. You represent that
          you are at least 13 years of age.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          4. Acceptable Use
        </ThemedText>
        <ThemedText>
          You agree not to use ConnectHQ for transmitting malware, harassment,
          spamming, violating laws, or unauthorized access.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          5. Limitation of Liability
        </ThemedText>
        <ThemedText>
          ConnectHQ IS PROVIDED ON AN "AS IS" BASIS. WE DISCLAIM ALL WARRANTIES.
          IN NO EVENT SHALL WE BE LIABLE FOR INDIRECT, SPECIAL, OR CONSEQUENTIAL
          DAMAGES.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          6. Termination
        </ThemedText>
        <ThemedText>
          We may terminate your account immediately if you violate these terms,
          engage in illegal activity, or compromise the app's integrity.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          7. Contact Information
        </ThemedText>
        <ThemedText>
          For questions about these Terms and Conditions:{"\n"}
          Email: support@connecthq.app
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
