import { auth } from "@/config/firebase";
import { getUserData, loginGuestByEmail } from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 16,
  },
  logo: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 12,
    marginBottom: 32,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0f172a",
  },
  tabTextInactive: {
    color: "#cbd5e1",
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    color: "#0f172a",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputText: {
    flex: 1,
    color: "#0f172a",
    fontWeight: "500",
    height: "100%",
  },
  passwordButton: {
    padding: 4,
  },
  submitButton: {
    marginTop: 32,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonGuest: {
    backgroundColor: "#4f46e5",
  },
  submitButtonAdmin: {
    backgroundColor: "#1e293b",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
  },
  footerText: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"guest" | "login">("guest");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const firebaseUser = userCredential.user;

      // Redirect based on user role from Firestore instead of hardcoded emails
      const userData = await getUserData(firebaseUser.uid);
      const role = userData?.role || "attendee";

      try {
        if (role === "admin" || role === "superadmin") {
          router.replace("/(admin)/panel");
        } else {
          router.replace("/(attendee)/agenda");
        }
      } catch (navError) {
        console.error("Navigation error:", navError);
        Alert.alert(
          "Navigation Error",
          "Failed to navigate. Please try again.",
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      Alert.alert("Error", "Please enter your name and email");
      return;
    }

    setGuestLoading(true);
    try {
      const result = await loginGuestByEmail(guestEmail.trim());
      if (result.success && result.qrToken) {
        await AsyncStorage.setItem("guestQrToken", result.qrToken);
        try {
          router.replace({
            pathname: "/(attendee)/qr-pass",
            params: { qrToken: result.qrToken },
          });
          return;
        } catch (navError) {
          console.error("Navigation error:", navError);
          Alert.alert(
            "Navigation Error",
            "Failed to navigate. Please try again.",
          );
        }
      }

      if (result.message === "Not on the guest list") {
        Alert.alert(
          "Not Registered",
          "This email is not in our guest list. Please contact the organizer.",
        );
      } else {
        Alert.alert(
          "Login Failed",
          result.message || "We could not log you in. Please try again.",
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Login failed. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
        }}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scrollContent}>
          {/* Centered Square Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/connecthq.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Welcome back to ConnectHQ</Text>
          </View>

          {/* Clean Light Form */}
          <View>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "guest" && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab("guest")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "guest"
                      ? styles.tabTextActive
                      : styles.tabTextInactive,
                  ]}
                >
                  Guest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "login" && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab("login")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "login"
                      ? styles.tabTextActive
                      : styles.tabTextInactive,
                  ]}
                >
                  Organizer
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "guest" ? (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#cbd5e1"
                  value={guestName}
                  onChangeText={setGuestName}
                  editable={!guestLoading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#cbd5e1"
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!guestLoading}
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    styles.submitButtonGuest,
                    guestLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleGuestLogin}
                  disabled={guestLoading}
                >
                  <Text style={styles.submitText}>Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Work Email"
                  placeholderTextColor="#cbd5e1"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.inputText}
                    placeholder="Password"
                    placeholderTextColor="#cbd5e1"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.passwordButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#cbd5e1"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    styles.submitButtonAdmin,
                    loading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  <Text style={styles.submitText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>ConnectHQ Event Management</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
