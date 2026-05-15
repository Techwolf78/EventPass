import { auth } from "@/config/firebase";
import { getUserData, UserRole } from "@/utils/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "firebase/auth";
import React, { createContext, ReactNode, useEffect, useState } from "react";

interface AuthUser extends User {
  role?: UserRole;
}

// Guest session data stored in AsyncStorage for persistence across app kills
export interface GuestSession {
  qrToken: string;
  name: string;
  email: string;
}

const GUEST_SESSION_KEY = "guestSession";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean; // Keeping for backward compatibility temporarily
  role: UserRole;
  guestSession: GuestSession | null;
  isGuest: boolean;
  logout: () => Promise<void>;
  saveGuestSession: (session: GuestSession) => Promise<void>;
  clearGuestSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  role: "attendee",
  guestSession: null,
  isGuest: false,
  logout: async () => {},
  saveGuestSession: async () => {},
  clearGuestSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("attendee");
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  // Save guest session to AsyncStorage for persistence across app kills
  const saveGuestSession = async (session: GuestSession) => {
    try {
      await AsyncStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
      // Also keep the legacy guestQrToken for backward compatibility
      await AsyncStorage.setItem("guestQrToken", session.qrToken);
      setGuestSession(session);
    } catch (error) {
      console.error("[Auth] Error saving guest session:", error);
    }
  };

  // Clear guest session from AsyncStorage (used on logout)
  const clearGuestSession = async () => {
    try {
      await AsyncStorage.multiRemove([GUEST_SESSION_KEY, "guestQrToken"]);
      setGuestSession(null);
    } catch (error) {
      console.error("[Auth] Error clearing guest session:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Step 1: Check for a persisted guest session in AsyncStorage
    const checkGuestSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(GUEST_SESSION_KEY);
        if (stored && isMounted) {
          const parsed: GuestSession = JSON.parse(stored);
          if (parsed.qrToken) {
            setGuestSession(parsed);
            console.log(
              "[Auth] Restored guest session for:",
              parsed.name || parsed.email,
            );
          }
        }
      } catch (error) {
        console.error("[Auth] Error reading guest session:", error);
      }
    };

    // Start both checks in parallel
    checkGuestSession();

    // Step 2: Listen for Firebase Auth state changes (admin/organizer users)
    const unsubscribe = auth.onAuthStateChanged(
      async (firebaseUser: User | null) => {
        if (!isMounted) return;

        if (firebaseUser) {
          // Get user data from Firestore which contains the role
          const userData = await getUserData(firebaseUser.uid);

          let currentRole: UserRole = "attendee";

          if (userData && userData.role) {
            currentRole = userData.role;
          } else {
            // Fallback to custom claims or hardcoded for safety/backwards compatibility
            const idTokenResult = await firebaseUser.getIdTokenResult();
            if (
              idTokenResult.claims.superadmin === true ||
              firebaseUser.email === "superadmin@test.com"
            ) {
              currentRole = "superadmin";
            } else if (
              idTokenResult.claims.admin === true ||
              firebaseUser.email === "admin@test.com"
            ) {
              currentRole = "admin";
            }
          }

          setUser(firebaseUser as AuthUser);
          setRole(currentRole);
        } else {
          setUser(null);
          setRole("attendee");
        }
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    // Clear guest session on logout
    await clearGuestSession();
    await auth.signOut();
  };

  const isAdmin = role === "admin" || role === "superadmin";
  const isGuest = !user && guestSession !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        role,
        guestSession,
        isGuest,
        logout,
        saveGuestSession,
        clearGuestSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
