import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "@/config/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { loginGuestByEmail } from "@/utils/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

      // Redirect based on user type after successful sign-in
      if (firebaseUser.email === "admin@test.com") {
        router.replace("/(admin)/panel");
      } else {
        router.replace("/(attendee)/agenda");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert("Google Sign In", "Coming soon!");
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
        router.replace({
          pathname: "/(attendee)/qr-pass",
          params: { qrToken: result.qrToken },
        });
        return;
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
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
        }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-8 max-w-[440px] self-center w-full">
          {/* Centered Square Logo */}
          <View className="items-center mb-6 pt-4">
            <Image
              source={require("../../assets/images/connecthq.png")}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
            <Text className="text-3xl font-black text-slate-900 tracking-tight mt-4">
              Login
            </Text>
            <Text className="text-slate-400 mt-2 text-base font-medium">
              Welcome back to ConnectHQ
            </Text>
          </View>

          {/* Clean Light Form */}
          <View>
            <View className="flex-row bg-slate-50 p-1 rounded-xl mb-8">
              <TouchableOpacity
                className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "guest" ? "bg-white shadow-sm" : ""}`}
                onPress={() => setActiveTab("guest")}
              >
                <Text
                  className={`text-sm font-semibold ${activeTab === "guest" ? "text-slate-900" : "text-slate-400"}`}
                >
                  Guest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === "login" ? "bg-white shadow-sm" : ""}`}
                onPress={() => setActiveTab("login")}
              >
                <Text
                  className={`text-sm font-semibold ${activeTab === "login" ? "text-slate-900" : "text-slate-400"}`}
                >
                  Organizer
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "guest" ? (
              <View>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 h-14 text-slate-900 font-medium border border-slate-100 mb-4"
                  placeholder="Full Name"
                  placeholderTextColor="#94a3b8"
                  value={guestName}
                  onChangeText={setGuestName}
                  editable={!guestLoading}
                />
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 h-14 text-slate-900 font-medium border border-slate-100"
                  placeholder="Email Address"
                  placeholderTextColor="#94a3b8"
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!guestLoading}
                />
                <TouchableOpacity
                  className={`mt-8 h-14 bg-indigo-600 rounded-xl items-center justify-center ${guestLoading ? "opacity-70" : ""}`}
                  onPress={handleGuestLogin}
                  disabled={guestLoading}
                >
                  <Text className="text-white font-bold text-base">
                    Continue
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 h-14 text-slate-900 font-medium border border-slate-100 mb-4"
                  placeholder="Work Email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
                <View className="flex-row items-center bg-slate-50 rounded-xl px-4 h-14 border border-slate-100">
                  <TextInput
                    className="flex-1 text-slate-900 font-medium h-full"
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className={`mt-8 h-14 bg-slate-900 rounded-xl items-center justify-center ${loading ? "opacity-70" : ""}`}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  <Text className="text-white font-bold text-base">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="mt-auto pt-10">
            <Text className="text-center text-slate-400 text-xs font-medium">
              ConnectHQ Event Management
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({});
