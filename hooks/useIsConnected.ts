import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

/**
 * A custom hook to check internet connectivity status in real-time.
 * Handles both Native (Android/iOS) and Web platforms cleanly without CORS errors.
 */
export function useIsConnected() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let active = true;

    // --- Web Platform (Browser preview) ---
    if (Platform.OS === "web") {
      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);

      // Set initial status
      setIsConnected(window.navigator.onLine);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // --- Native Platforms (Android & iOS) ---
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

        // Fast request to a standard Google connectivity check endpoint
        await fetch("https://connectivitycheck.gstatic.com/generate_204", {
          method: "GET",
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        });

        clearTimeout(timeoutId);
        if (active) {
          setIsConnected(true);
        }
      } catch (error) {
        if (active) {
          setIsConnected(false);
        }
      }
    };

    // Initial check
    checkConnection();

    // Re-check when app returns from background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkConnection();
      }
    });

    // Check periodically every 6 seconds to capture network drops
    const interval = setInterval(checkConnection, 6000);

    return () => {
      active = false;
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return isConnected;
}
