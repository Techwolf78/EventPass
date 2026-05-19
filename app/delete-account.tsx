import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { ScrollView } from "react-native";

export default function DeleteAccount() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <ThemedView style={{ padding: 20, backgroundColor: "#0f172a" }}>
        <ThemedText
          type="title"
          style={{ fontSize: 28, marginBottom: 10, color: "#dc2626" }}
        >
          Delete Your Account
        </ThemedText>

        <ThemedView
          style={{
            backgroundColor: "#fee2e2",
            borderLeftWidth: 4,
            borderLeftColor: "#dc2626",
            padding: 15,
            marginVertical: 20,
          }}
        >
          <ThemedText style={{ color: "#991b1b" }}>
            <strong>⚠️ Warning:</strong> Deleting your account is permanent and
            cannot be undone. All your event data, certificates, and account
            information will be deleted.
          </ThemedText>
        </ThemedView>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Before You Delete
        </ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          • All your event attendance records will be deleted{"\n"}• You won't
          be able to access your certificates{"\n"}• Event organizers may no
          longer see your check-in history{"\n"}• This action cannot be reversed
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          How to Delete Your Account
        </ThemedText>

        <ThemedText style={{ fontWeight: "bold", marginVertical: 10 }}>
          Contact Support to Request Deletion
        </ThemedText>
        <ThemedText style={{ marginVertical: 8 }}>
          To delete your account, please send an email to our support team with
          the subject line "Account Deletion Request" and include:
        </ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          • Your registered email address{"\n"}• A brief confirmation that you
          understand deletion is permanent{"\n"}• Any feedback about why you're
          deleting (optional)
        </ThemedText>
        <ThemedText style={{ marginVertical: 8, fontStyle: "italic" }}>
          Once we receive your email, we'll send a confirmation link to verify
          your request. Click the link to confirm, and your account will be
          scheduled for deletion.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Data Deletion Timeline
        </ThemedText>
        <ThemedText style={{ marginLeft: 15, marginVertical: 8 }}>
          1. <strong>Immediately:</strong> Your account access is terminated
          {"\n"}
          2. <strong>Within 7 days:</strong> You must confirm deletion via email
          (if requested via form){"\n"}
          3. <strong>Within 30 days:</strong> All personal data is permanently
          deleted{"\n"}
          4. <strong>Within 90 days:</strong> Data is purged from all backups
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Your Rights
        </ThemedText>
        <ThemedText>
          Under data protection regulations (GDPR, CCPA, etc.), you have the
          right to request deletion of your personal data, receive a copy of
          your data before deletion, and have your deletion confirmed in
          writing.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          FAQ
        </ThemedText>

        <ThemedText style={{ fontWeight: "bold", marginVertical: 10 }}>
          Q: Can I recover my account after deletion?
        </ThemedText>
        <ThemedText>
          A: No, account deletion is permanent. Contact support before
          confirming deletion if you're reconsidering.
        </ThemedText>

        <ThemedText style={{ fontWeight: "bold", marginVertical: 10 }}>
          Q: What happens to my event attendance records?
        </ThemedText>
        <ThemedText>
          A: Your personal data will be deleted. Event organizers may retain
          anonymized statistics, but won't be able to link them to you.
        </ThemedText>

        <ThemedText style={{ fontWeight: "bold", marginVertical: 10 }}>
          Q: How long does deletion take?
        </ThemedText>
        <ThemedText>
          A: Your account is immediately deactivated. Complete deletion takes up
          to 30 days.
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginTop: 20, marginBottom: 10 }}>
          Contact Support
        </ThemedText>
        <ThemedView
          style={{
            backgroundColor: "#1e293b",
            borderRadius: 8,
            padding: 15,
            marginVertical: 15,
          }}
        >
          <ThemedText style={{ fontSize: 14, marginBottom: 8 }}>
            📧 <strong>Send Your Deletion Request To:</strong>
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: "#4f46e5",
              marginVertical: 5,
            }}
          >
            synergysphere@gryphonacademy.co.in
          </ThemedText>
          <ThemedText style={{ fontSize: 12, marginTop: 10, opacity: 0.8 }}>
            Subject: Account Deletion Request
          </ThemedText>
        </ThemedView>
        <ThemedText style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
          We typically respond within 24-48 business hours. Once confirmed, your
          account will be fully deleted within 30 days.
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
