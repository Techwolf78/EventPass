import { auth } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { getUserData, loginGuestByEmail } from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
// import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
    paddingHorizontal: 24,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 16,
  },
  logoWrapper: {
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
  },
  logo: {
    width: 112,
    height: 112,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748b",
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 14,
    marginBottom: 28,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0f172a",
  },
  tabTextInactive: {
    color: "#94a3b8",
  },
  // Label styles
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    color: "#0f172a",
    fontWeight: "500",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  inputText: {
    flex: 1,
    color: "#0f172a",
    fontWeight: "500",
    fontSize: 16,
    height: "100%",
  },
  passwordButton: {
    padding: 8,
  },
  submitButton: {
    marginTop: 24,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonGuest: {
    backgroundColor: "#4f46e5",
  },
  submitButtonAdmin: {
    backgroundColor: "#1e293b",
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
    paddingBottom: 8,
  },
  footerText: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    marginLeft: 4,
  },
  successText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 4,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  inputSuccess: {
    borderColor: "#22c55e",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 10,
  },
  termsLink: {
    color: "#4f46e5",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
  },
  modalScroll: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  // Guest helper text
  helperText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 4,
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveGuestSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"guest" | "login">("guest");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Request notifications permission
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        if (status !== "granted") {
          console.warn("Notification permission not granted");
        }
      } catch (error) {
        console.error("Error requesting permissions:", error);
      }
    };

    requestPermissions();
  }, []);

  // Clear errors when switching tabs
  const handleTabChange = (tab: "guest" | "login") => {
    setActiveTab(tab);
    setEmailError("");
    setAdminError("");
  };

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleSignIn = async () => {
    setAdminError("");
    if (!acceptedTerms) {
      setAdminError("Please accept terms and conditions");
      return;
    }
    if (!email || !password) {
      setAdminError("Invalid credentials");
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

      const userData = await getUserData(firebaseUser.uid);
      let role = userData?.role || "attendee";

      // Fallback matching AuthContext for admin/superadmin emails
      if (role === "attendee") {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        if (
          idTokenResult.claims.superadmin === true ||
          firebaseUser.email === "superadmin@test.com" ||
          firebaseUser.email === "admin@gryphonacademy.co.in"
        ) {
          role = "superadmin";
        } else if (
          idTokenResult.claims.admin === true ||
          firebaseUser.email === "admin@test.com" ||
          firebaseUser.email === "connect@gryphonacademy.co.in"
        ) {
          role = "admin";
        }
      }

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
      setAdminError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setEmailError("");
    if (!acceptedTerms) {
      setEmailError("Please accept terms and conditions");
      return;
    }

    const checkEmailLower = guestEmail.trim().toLowerCase();
    const checkNameLower = guestName.trim().toLowerCase();

    // 1. Apple Reviewer Auto-fill (Must be active in production for App Review Reviewers)
    const isReviewerAutoFill = 
      checkEmailLower === "superadmin@test.com" || 
      checkNameLower === "superadmin@test.com" || 
      checkEmailLower === "12345678" || 
      checkNameLower === "12345678";

    if (isReviewerAutoFill) {
      setActiveTab("login");
      setEmail("superadmin@test.com");
      setPassword("12345678");
      setAdminError("Auto-filled Organizer credentials. Tap Sign In.");
      return;
    }

    // 2. Official credentials Auto-fill (Guarded behind __DEV__ for security in production)
    if (__DEV__) {
      const isSuperAdminAutoFill = 
        checkEmailLower === "superadmin" ||
        checkNameLower === "superadmin" ||
        checkEmailLower === "admin@gryphonacademy.co.in" ||
        checkNameLower === "admin@gryphonacademy.co.in";

      const isAdminAutoFill =
        checkEmailLower === "connect" ||
        checkNameLower === "connect" ||
        checkEmailLower === "connect@gryphonacademy.co.in" ||
        checkNameLower === "connect@gryphonacademy.co.in";

      if (isSuperAdminAutoFill) {
        setActiveTab("login");
        setEmail("admin@gryphonacademy.co.in");
        setPassword("Event5878");
        setAdminError("Auto-filled Superadmin credentials. Tap Sign In.");
        return;
      } else if (isAdminAutoFill) {
        setActiveTab("login");
        setEmail("connect@gryphonacademy.co.in");
        setPassword("Event2468");
        setAdminError("Auto-filled Admin credentials. Tap Sign In.");
        return;
      }
    }

    if (!guestName.trim()) {
      setEmailError("Please enter your full name");
      return;
    }

    if (!guestEmail.trim() || !validateEmail(guestEmail.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setGuestLoading(true);
    try {
      const result = await loginGuestByEmail(guestEmail.trim());
      if (result.success && result.qrToken) {
        // Save the full guest session for persistence across app kills
        await saveGuestSession({
          qrToken: result.qrToken,
          name: guestName.trim(),
          email: guestEmail.trim(),
        });
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
        setEmailError(
          "This email is not on the guest list. Please contact the event organizer.",
        );
      } else if (
        result.message &&
        result.message.toLowerCase().includes("deleted")
      ) {
        setEmailError(result.message);
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
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scrollContent}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../../assets/images/connecthq.png")}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>
              Gryphon Academy • Event Management
            </Text>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "guest" && styles.tabButtonActive,
              ]}
              onPress={() => handleTabChange("guest")}
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
              onPress={() => handleTabChange("login")}
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
              {/* Name Field with Label */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    emailError && !guestName.trim() ? styles.inputError : null,
                  ]}
                  placeholder="John Doe"
                  placeholderTextColor="#cbd5e1"
                  onChangeText={(text) => {
                    setGuestName(text);
                    if (emailError) setEmailError("");

                    const lowerText = text.toLowerCase().trim();
                    
                    // Apple Reviewer Auto-fill (Production)
                    if (
                      lowerText === "superadmin@test.com" ||
                      lowerText === "12345678"
                    ) {
                      setActiveTab("login");
                      setEmail("superadmin@test.com");
                      setPassword("12345678");
                      setAdminError("Auto-filled Organizer credentials. Tap Sign In.");
                    }
                    // Official Credentials Auto-fill (Development Only)
                    else if (__DEV__) {
                      if (
                        lowerText === "superadmin" ||
                        lowerText === "admin@gryphonacademy.co.in"
                      ) {
                        setActiveTab("login");
                        setEmail("admin@gryphonacademy.co.in");
                        setPassword("Event5878");
                        setAdminError("Auto-filled Superadmin credentials. Tap Sign In.");
                      } else if (
                        lowerText === "admin@test.com" ||
                        lowerText === "connect" ||
                        lowerText === "connect@gryphonacademy.co.in"
                      ) {
                        setActiveTab("login");
                        setEmail("connect@gryphonacademy.co.in");
                        setPassword("Event2468");
                        setAdminError("Auto-filled Admin credentials. Tap Sign In.");
                      }
                    }
                  }}
                  editable={!guestLoading}
                />
              </View>

              {/* Email Field with Label */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="you@example.com"
                  placeholderTextColor="#cbd5e1"
                  value={guestEmail}
                  onChangeText={(text) => {
                    setGuestEmail(text);
                    if (emailError) setEmailError("");

                    const lowerText = text.toLowerCase().trim();
                    
                    // Apple Reviewer Auto-fill (Production)
                    if (
                      lowerText === "superadmin@test.com" ||
                      lowerText === "12345678"
                    ) {
                      setActiveTab("login");
                      setEmail("superadmin@test.com");
                      setPassword("12345678");
                      setAdminError("Auto-filled Organizer credentials. Tap Sign In.");
                    }
                    // Official Credentials Auto-fill (Development Only)
                    else if (__DEV__) {
                      if (
                        lowerText === "superadmin" ||
                        lowerText === "admin@gryphonacademy.co.in"
                      ) {
                        setActiveTab("login");
                        setEmail("admin@gryphonacademy.co.in");
                        setPassword("Event5878");
                        setAdminError("Auto-filled Superadmin credentials. Tap Sign In.");
                      } else if (
                        lowerText === "admin@test.com" ||
                        lowerText === "connect" ||
                        lowerText === "connect@gryphonacademy.co.in"
                      ) {
                        setActiveTab("login");
                        setEmail("connect@gryphonacademy.co.in");
                        setPassword("Event2468");
                        setAdminError("Auto-filled Admin credentials. Tap Sign In.");
                      }
                    }
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!guestLoading}
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Terms Checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <Ionicons
                    name={acceptedTerms ? "checkbox" : "square-outline"}
                    size={22}
                    color={acceptedTerms ? "#4f46e5" : "#cbd5e1"}
                  />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => setShowTerms(true)}
                  >
                    Terms and Conditions
                  </Text>
                </Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  styles.submitButtonGuest,
                  (guestLoading || !acceptedTerms) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleGuestLogin}
                disabled={guestLoading || !acceptedTerms}
              >
                <Text style={styles.submitText}>
                  {guestLoading ? "Verifying..." : "Continue to Event"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Email Field with Label */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Work Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    adminError
                      ? adminError.includes("Auto-filled")
                        ? styles.inputSuccess
                        : styles.inputError
                      : null,
                  ]}
                  placeholder="admin@yourcompany.com"
                  placeholderTextColor="#cbd5e1"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (adminError) setAdminError("");
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              {/* Password Field with Label */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    adminError
                      ? adminError.includes("Auto-filled")
                        ? styles.inputSuccess
                        : styles.inputError
                      : null,
                  ]}
                >
                  <TextInput
                    style={styles.inputText}
                    placeholder="Enter your password"
                    placeholderTextColor="#cbd5e1"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (adminError) setAdminError("");
                    }}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.passwordButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                {adminError ? (
                  <Text
                    style={
                      adminError.includes("Auto-filled")
                        ? styles.successText
                        : styles.errorText
                    }
                  >
                    {adminError}
                  </Text>
                ) : null}
              </View>

              {/* Terms Checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                >
                  <Ionicons
                    name={acceptedTerms ? "checkbox" : "square-outline"}
                    size={22}
                    color={acceptedTerms ? "#1e293b" : "#cbd5e1"}
                  />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => setShowTerms(true)}
                  >
                    Terms and Conditions
                  </Text>
                </Text>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  styles.submitButtonAdmin,
                  (loading || !acceptedTerms) && styles.submitButtonDisabled,
                ]}
                onPress={handleSignIn}
                disabled={loading || !acceptedTerms}
              >
                <Text style={styles.submitText}>
                  {loading ? "Signing in..." : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 Gryphon Academy — All rights reserved
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTerms}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalBody}>
                Last updated on April 27, 2026.{"\n\n"}
                Please read these terms and conditions carefully before using
                Our Service.
              </Text>

              <Text style={styles.modalSectionTitle}>1. Acknowledgment</Text>
              <Text style={styles.modalBody}>
                These are the Terms and Conditions governing the use of this
                Service and the agreement that operates between You and the
                Company. These Terms and Conditions set out the rights and
                obligations of all users regarding the use of the Service.
                {"\n\n"}
                Your access to and use of the Service is conditioned on Your
                acceptance of and compliance with these Terms and Conditions.
              </Text>

              <Text style={styles.modalSectionTitle}>2. User Accounts</Text>
              <Text style={styles.modalBody}>
                When You create an account with Us, You must provide Us
                information that is accurate, complete, and current at all
                times. Failure to do so constitutes a breach of the Terms, which
                may result in immediate termination of Your account on Our
                Service.{"\n\n"}
                You are responsible for safeguarding the password that You use
                to access the Service.
              </Text>

              <Text style={styles.modalSectionTitle}>3. Content</Text>
              <Text style={styles.modalBody}>
                Our Service allows You to post Content. You are responsible for
                the Content that You post to the Service, including its
                legality, reliability, and appropriateness.{"\n\n"}
                By posting Content to the Service, You grant Us the right and
                license to use, modify, publicly perform, publicly display,
                reproduce, and distribute such Content.
              </Text>

              <Text style={styles.modalSectionTitle}>
                4. Intellectual Property
              </Text>
              <Text style={styles.modalBody}>
                The Service and its original content (excluding Content provided
                by You or other users), features and functionality are and will
                remain the exclusive property of the Company and its licensors.
              </Text>

              <Text style={styles.modalSectionTitle}>5. Termination</Text>
              <Text style={styles.modalBody}>
                We may terminate or suspend Your Account immediately, without
                prior notice or liability, for any reason whatsoever, including
                without limitation if You breach these Terms and Conditions.
              </Text>

              <Text style={styles.modalSectionTitle}>
                6. Limitation of Liability
              </Text>
              <Text style={styles.modalBody}>
                To the maximum extent permitted by applicable law, in no event
                shall the Company or its suppliers be liable for any special,
                incidental, indirect, or consequential damages whatsoever.
              </Text>

              <Text style={styles.modalSectionTitle}>7. Governing Law</Text>
              <Text style={styles.modalBody}>
                The laws of the Country, excluding its conflicts of law rules,
                shall govern this Terms and Your use of the Service.
              </Text>

              <Text style={styles.modalSectionTitle}>
                8. Changes to These Terms
              </Text>
              <Text style={styles.modalBody}>
                We reserve the right, at Our sole discretion, to modify or
                replace these Terms at any time. By continuing to access or use
                Our Service after those revisions become effective, You agree to
                be bound by the revised terms.
              </Text>

              <Text style={styles.modalSectionTitle}>9. Contact Us</Text>
              <Text style={styles.modalBody}>
                If you have any questions about these Terms and Conditions, You
                can contact us through our website or via email.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
