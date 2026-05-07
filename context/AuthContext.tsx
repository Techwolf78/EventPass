import { auth } from "@/config/firebase";
import { getUserData } from "@/utils/firestore";
import { User } from "firebase/auth";
import React, { createContext, ReactNode, useEffect, useState } from "react";

export type UserRole = "attendee" | "admin" | "superadmin";

interface AuthUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean; // Keeping for backward compatibility temporarily
  role: UserRole;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  role: "attendee",
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("attendee");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      async (firebaseUser: User | null) => {
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

    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, role, logout }}>
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
