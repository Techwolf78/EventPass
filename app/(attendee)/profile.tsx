import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getCandidateByEmail, getCandidateByQRToken, getGuestByQRToken, Candidate } from '@/utils/firestore';
import { useAuth } from '@/context/AuthContext';
import { getAttendeePalette, EnrollmentType } from '@/hooks/use-attendee-theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string;
    enrollmentType: string;
    department: string;
    qrToken: string;
  } | null>(null);
  const palette = getAttendeePalette(profile?.enrollmentType as EnrollmentType | undefined);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      let resolvedCandidate: Candidate | null = null;
      let resolvedProfile: {
        name: string;
        email: string;
        role: string;
        enrollmentType: string;
        department: string;
        qrToken: string;
      } | null = null;

      if (user?.email) {
        resolvedCandidate = await getCandidateByEmail(user.email);
      }

      if (!resolvedCandidate) {
        const storedToken = await AsyncStorage.getItem('guestQrToken');
        if (storedToken) {
          resolvedCandidate = await getCandidateByQRToken(storedToken);
          if (!resolvedCandidate) {
            const guest = await getGuestByQRToken(storedToken);
            if (guest) {
              resolvedProfile = {
                name: guest.name,
                email: guest.email,
                role: 'attendee',
                enrollmentType: guest.enrollmentType,
                department: '',
                qrToken: guest.qrToken || '',
              };
            }
          }
        }
      }

      if (resolvedCandidate) {
        resolvedProfile = {
          name: resolvedCandidate.name,
          email: resolvedCandidate.email,
          role: resolvedCandidate.role,
          enrollmentType: resolvedCandidate.enrollmentType,
          department: resolvedCandidate.department || '',
          qrToken: resolvedCandidate.qrToken,
        };
      }

      setProfile(resolvedProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await AsyncStorage.removeItem('guestQrToken');
    if (user) {
      await logout();
    }
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}> 
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  const safeProfile = profile || {
    name: 'Guest',
    email: '—',
    role: 'attendee',
    enrollmentType: 'event',
    department: '',
    qrToken: '',
  };

  return (
    <LinearGradient colors={palette.backgroundGradient} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <Text style={styles.name}>{safeProfile.name}</Text>
          <Text style={styles.subtitle}>{safeProfile.email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>{safeProfile.role}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Enrollment</Text>
            <Text style={[styles.detailValue, { color: palette.primaryText }]}>
              {safeProfile.enrollmentType}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>{safeProfile.department || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pass ID</Text>
            <Text style={styles.detailValue}>
              {safeProfile.qrToken
                ? `EVNT-2025-${safeProfile.qrToken.substring(0, 4).toUpperCase()}`
                : 'EVNT-2025-—'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  signOutButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '700',
  },
});
