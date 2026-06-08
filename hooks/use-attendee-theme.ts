import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import {
  getCandidateByEmail,
  getCandidateByQRToken,
  getGuestByQRToken,
  Candidate,
} from "@/utils/firestore";

export type EnrollmentType = "masterclass" | "event";

/**
 * Maps internal enrollment type values to user-facing display names.
 * "event" -> "Synergy Sphere", "masterclass" -> "Masterclass"
 */
export const getEnrollmentDisplayName = (
  type?: EnrollmentType | string | null,
): string => {
  if (type === "masterclass") return "Masterclass";
  if (type === "event") return "Synergy Sphere";
  return "Synergy Sphere"; // default
};

export type AttendeePalette = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryBorder: string;
  primaryText: string;
  gradient: [string, string];
  backgroundGradient: [string, string];
};

const ATTENDEE_PALETTES: Record<EnrollmentType, AttendeePalette> = {
  event: {
    primary: "#ef4444", // Red for Synergy Sphere (event)
    primaryDark: "#dc2626",
    primarySoft: "#fee2e2",
    primaryBorder: "#fecaca",
    primaryText: "#b91c1c",
    gradient: ["#ef4444", "#dc2626"],
    backgroundGradient: ["#fef2f2", "#fff"],
  },
  masterclass: {
    primary: "#06b6d4", // Teal for Masterclass (matching qr-pass.tsx)
    primaryDark: "#0891b2",
    primarySoft: "#ecfeff",
    primaryBorder: "#c5f6fa",
    primaryText: "#0891b2",
    gradient: ["#06b6d4", "#0891b2"],
    backgroundGradient: ["#ecfeff", "#fff"],
  },
};

export const getAttendeePalette = (
  enrollmentType?: EnrollmentType | null,
): AttendeePalette => {
  if (enrollmentType === "masterclass") {
    return ATTENDEE_PALETTES.masterclass;
  }
  return ATTENDEE_PALETTES.event;
};

export function useAttendeeTheme(qrToken?: string | null) {
  const { user } = useAuth();
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>("event");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveEnrollment = async () => {
      try {
        let resolvedType: EnrollmentType | null = null;

        if (user?.email) {
          const candidate = await getCandidateByEmail(user.email);
          if (candidate?.enrollmentType) {
            resolvedType = candidate.enrollmentType;
          }
        }

        if (!resolvedType) {
          const storedToken =
            qrToken || (await AsyncStorage.getItem("guestQrToken"));
          if (storedToken) {
            const candidateByToken = await getCandidateByQRToken(storedToken);
            if (candidateByToken?.enrollmentType) {
              resolvedType = candidateByToken.enrollmentType;
            }

            if (!resolvedType) {
              const guest = await getGuestByQRToken(storedToken);
              if (guest?.enrollmentType) {
                resolvedType = guest.enrollmentType;
              }
            }
          }
        }

        if (active && resolvedType) {
          setEnrollmentType(resolvedType);
        }
      } catch (error) {
        console.error("Error resolving attendee theme:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    resolveEnrollment();

    return () => {
      active = false;
    };
  }, [qrToken, user?.email]);

  const palette = getAttendeePalette(enrollmentType);

  return { enrollmentType, palette, loading };
}
