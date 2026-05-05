import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import {
  getCandidateByEmail,
  getCandidateByQRToken,
  getGuestByQRToken,
  Candidate,
} from '@/utils/firestore';

export type EnrollmentType = 'masterclass' | 'event';

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
    primary: '#6366f1', // Indigo instead of sharp purple
    primaryDark: '#4f46e5',
    primarySoft: '#e0e7ff',
    primaryBorder: '#c7d2fe',
    primaryText: '#4338ca',
    gradient: ['#6366f1', '#4f46e5'], // Smoother transition
    backgroundGradient: ['#f8fafc', '#eff6ff'], // Very subtle blue tint
  },
  masterclass: {
    primary: '#f43f5e', // Rose instead of sharp red
    primaryDark: '#e11d48',
    primarySoft: '#ffe4e6',
    primaryBorder: '#fecdd3',
    primaryText: '#be123c',
    gradient: ['#f43f5e', '#e11d48'],
    backgroundGradient: ['#fdfbfb', '#fff0f2'],
  },
};

export const getAttendeePalette = (enrollmentType?: EnrollmentType | null): AttendeePalette => {
  if (enrollmentType === 'masterclass') {
    return ATTENDEE_PALETTES.masterclass;
  }
  return ATTENDEE_PALETTES.event;
};

export function useAttendeeTheme(qrToken?: string | null) {
  const { user } = useAuth();
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>('event');
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
          const storedToken = qrToken || (await AsyncStorage.getItem('guestQrToken'));
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
        console.error('Error resolving attendee theme:', error);
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
