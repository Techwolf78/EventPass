import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading, isAdmin, isGuest, guestSession } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Firebase-authenticated admin → admin panel
  if (user && isAdmin) {
    return <Redirect href="/(admin)/panel" />;
  }

  // Firebase-authenticated attendee → agenda
  if (user) {
    return <Redirect href="/(attendee)/agenda" />;
  }

  // Guest with a saved session → QR pass
  if (isGuest && guestSession) {
    return <Redirect href="/(attendee)/qr-pass" />;
  }

  // No session at all → login
  return <Redirect href="/login" />;
}
