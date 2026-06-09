import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

export default function Support() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit =
    name.trim().length > 1 &&
    email.trim().length > 4 &&
    message.trim().length > 9 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      await addDoc(collection(db, "support_responses"), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        status: "new",
        source: "support_url",
        platform: Platform.OS,
        createdAt: serverTimestamp(),
      });

      setName("");
      setEmail("");
      setMessage("");
      setStatus("success");
    } catch (error) {
      console.error("Support form submission failed:", error);
      setStatus("error");
      setErrorMessage("We could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="help-buoy" size={28} color="#2563eb" />
            </View>
            <Text style={styles.brand}>ConnectHQ</Text>
            <Text style={styles.title}>Support</Text>
            <Text style={styles.subtitle}>
              Send us your question or issue and our team will review it.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="email"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>How can we help?</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what happened..."
                placeholderTextColor="#94a3b8"
                style={[styles.input, styles.messageInput]}
                multiline
                textAlignVertical="top"
              />
            </View>

            {status === "success" && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                <Text style={styles.successText}>
                  Your support request has been submitted.
                </Text>
              </View>
            )}

            {status === "error" && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#ffffff" />
                  <Text style={styles.buttonText}>Submit Support Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              For urgent help, email synergysphere@gryphonacademy.co.in
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginBottom: 16,
  },
  brand: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 420,
  },
  form: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    padding: 20,
    gap: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  messageInput: {
    minHeight: 140,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
  },
  successText: {
    flex: 1,
    color: "#166534",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
