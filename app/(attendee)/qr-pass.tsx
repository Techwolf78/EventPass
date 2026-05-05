import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { getCheckInStatus, CheckInStatusResult, getCandidateByQRToken, getCandidateByEmail, Candidate, subscribeToCheckInStatus } from '../../utils/firestore';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAttendeeTheme } from '@/hooks/use-attendee-theme';

export default function QRPassScreen() {
  const router = useRouter();
  const { qrToken } = useLocalSearchParams();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [qrRef, setQrRef] = useState<any>(null);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatusResult | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedToken, setResolvedToken] = useState<string | null>((qrToken as string) || null);

  const qrSize = Math.min(width * 0.5, 220);
  const activeToken = resolvedToken || (qrToken as string);
  const { palette } = useAttendeeTheme(activeToken || undefined);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | null = null;

    const setupData = async () => {
      let token: string | null = (qrToken as string) || null;

      // 1. Resolve Token
      if (!token && user?.email) {
        try {
          const candidateByEmail = await getCandidateByEmail(user.email);
          if (candidateByEmail) {
            token = candidateByEmail.qrToken;
            setResolvedToken(token);
          }
        } catch (error) {
          console.error('Error fetching candidate by email:', error);
        }
      }

      if (!token) {
        try {
          const storedToken = await AsyncStorage.getItem('guestQrToken');
          if (storedToken) {
            token = storedToken;
            setResolvedToken(token);
          }
        } catch (error) {
          console.error('Error reading guest token:', error);
        }
      }

      if (!token) {
        setLoading(false);
        return;
      }

      // 2. Fetch Candidate Info Once
      try {
        const candidateData = await getCandidateByQRToken(token);
        setCandidate(candidateData);
      } catch (error) {
        console.error('Error fetching candidate data:', error);
      }

      // 3. Listen for Check-In Status in Real-Time
      unsubscribeStatus = subscribeToCheckInStatus(token, (status) => {
        setCheckInStatus(status);
        setLoading(false);
      });
    };

    setupData();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, [qrToken, user]);

  if (!activeToken) {
    return (
      <LinearGradient colors={['#f43f5e', '#e11d48']} style={styles.gradient}>
        <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
          <View style={styles.errorIconBg}>
            <Ionicons name="alert-circle" size={50} color="#fff" />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>No QR token found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace('/(attendee)/register')}
          >
            <Text style={styles.errorButtonText}>Back to Registration</Text>
            <Ionicons name="arrow-back" size={18} color="#e11d48" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={palette.gradient} style={styles.gradient}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading your pass...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Show "Already Checked In" message
  if (checkInStatus?.hasCheckedIn) {
    return (
      <LinearGradient colors={['#10b981', '#059669']} style={styles.gradient}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={48} color="#fff" />
            <Text style={styles.headerTitle}>Already Checked In!</Text>
            <Text style={styles.headerSubtitle}>Welcome to the event</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.successContainer}>
              <View style={styles.successIconBg}>
                <Ionicons name="checkmark" size={60} color="#fff" />
              </View>
              <Text style={styles.successTitle}>You're All Set!</Text>
              <Text style={styles.successMessage}>
                You have already checked in for this event
              </Text>
            </View>

            <View style={styles.checkedInDetailsBox}>
              <View style={styles.checkedInDetailItem}>
                <View style={styles.checkedInDetailLabel}>
                  <Ionicons name="person" size={20} color="#10b981" />
                  <Text style={styles.checkedInDetailLabelText}>Name</Text>
                </View>
                <Text style={styles.checkedInDetailValue} numberOfLines={1}>{checkInStatus.candidateName}</Text>
              </View>

              <View style={styles.checkedInDetailItem}>
                <View style={styles.checkedInDetailLabel}>
                  <Ionicons name="mail" size={20} color="#10b981" />
                  <Text style={styles.checkedInDetailLabelText}>Email</Text>
                </View>
                <Text style={styles.checkedInDetailValue} numberOfLines={1}>{checkInStatus.candidateEmail}</Text>
              </View>

              {checkInStatus.checkedInAt && (
                <View style={styles.checkedInDetailItem}>
                  <View style={styles.checkedInDetailLabel}>
                    <Ionicons name="time" size={20} color="#10b981" />
                    <Text style={styles.checkedInDetailLabelText}>Check-In Time</Text>
                  </View>
                  <Text style={styles.checkedInDetailValue}>
                    {checkInStatus.checkedInAt instanceof Object && 'toDate' in checkInStatus.checkedInAt
                      ? checkInStatus.checkedInAt.toDate().toLocaleString()
                      : 'Today'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.checkedInPrimaryBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(attendee)/agenda',
                    params: { qrToken: activeToken },
                  })
                }
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.checkedInPrimaryBtnText}>View Agenda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkedInSecondaryBtn}
                onPress={() => router.replace('/(attendee)/register')}
              >
                <Ionicons name="home" size={20} color="#10b981" />
                <Text style={styles.checkedInSecondaryBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.footerNote, { paddingBottom: insets.bottom + 100 }]}>
            Enjoy the event! If you need any assistance, contact the organizers.
          </Text>
        </ScrollView>
      </LinearGradient>
    );
  }

  const handleSaveToPhotos = async () => {
    try {
      if (qrRef) {
        qrRef.toDataURL((dataURL: string) => {
          Sharing.shareAsync(dataURL, {
            mimeType: 'image/png',
            dialogTitle: 'Save your ConnectHQ QR Code',
          });
        });
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
    }
  };

  const uniqueId = candidate?.qrToken
    ? `EVNT-2025-${candidate.qrToken.substring(0, 4).toUpperCase()}`
    : 'EVNT-2025-XXXX';

  const handleViewAgenda = () => {
    router.push({
      pathname: '/(attendee)/agenda',
      params: { qrToken: activeToken },
    });
  };

  return (
    <LinearGradient colors={palette.backgroundGradient} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Banner */}
        <LinearGradient
          colors={palette.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.eventBanner, { paddingTop: insets.top + 24, shadowColor: palette.primary }]}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextBlock}>
              <Text style={styles.bannerEventName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                INNOVATESUMMIT 2025
              </Text>
              <View style={styles.bannerDetailRow}>
                <Ionicons name="calendar" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.bannerDetailText}>May 15, 2025</Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.bannerDetailText} numberOfLines={1}>Convention Center, Hall A</Text>
              </View>
            </View>
            <View style={styles.bannerBadge}>
              <Ionicons name="ticket" size={28} color="#fff" />
            </View>
          </View>
        </LinearGradient>

        {/* Main Card */}
        <View style={styles.card}>
          {/* QR Section */}
          <View style={styles.qrSection}>
            <View style={[styles.qrBackground, { borderColor: palette.primaryBorder }]}>
              <QRCode
                getRef={setQrRef}
                value={activeToken}
                size={qrSize}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.qrLabel}>Scan at entrance</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Attendee Details */}
          <View style={styles.detailsSection}>
            <Text style={[styles.detailsTitle, { color: palette.primaryText }]}>Attendee</Text>
            <View style={styles.attendeeRow}>
              <View style={styles.attendeeItem}>
                <Text style={styles.attendeeLabel}>Name</Text>
                <Text style={styles.attendeeValue} numberOfLines={1}>{candidate?.name || '\u2014'}</Text>
              </View>
              <View style={styles.attendeeItem}>
                <Text style={styles.attendeeLabel}>Email</Text>
                <Text style={styles.attendeeValue} numberOfLines={1}>{candidate?.email || '\u2014'}</Text>
              </View>
            </View>
            <View style={styles.attendeeRow}>
              <View style={styles.attendeeItem}>
                <Text style={styles.attendeeLabel}>Role</Text>
                <Text style={styles.attendeeValue}>{candidate?.role || 'Attendee'}</Text>
              </View>
              <View style={styles.attendeeItem}>
                <Text style={styles.attendeeLabel}>Pass ID</Text>
                <Text style={[styles.attendeeValueMono, { color: palette.primaryText }]} numberOfLines={1}>{uniqueId}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
           
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { backgroundColor: palette.primarySoft, borderColor: palette.primary },
              ]}
              onPress={handleViewAgenda}
            >
              <Ionicons name="calendar" size={20} color={palette.primaryText} />
              <Text style={[styles.secondaryBtnText, { color: palette.primaryText }]}>View Agenda</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Present this QR code at the entrance for check-in.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 8,
  },
  // Event Banner
  eventBanner: {
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTextBlock: {
    flex: 1,
  },
  bannerEventName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  bannerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  bannerDetailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    flexShrink: 1,
  },
  bannerBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 28,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  // QR Section
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrBackground: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignSelf: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  qrLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 20,
  },
  // Attendee Details
  detailsSection: {
    marginBottom: 28,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  attendeeRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  attendeeItem: {
    flex: 1,
    minWidth: 0,
  },
  attendeeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  attendeeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    flexShrink: 1,
  },
  attendeeValueMono: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6366f1',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  // Action Buttons
  buttonGroup: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    flexShrink: 1,
  },
  secondaryBtn: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryBtnText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
    flexShrink: 1,
  },
  // Footer
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 20,
    marginBottom: 20,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 32,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#e11d48',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  // Checked-in state
  successContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  checkedInDetailsBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  checkedInDetailItem: {
    marginBottom: 16,
  },
  checkedInDetailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkedInDetailLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  checkedInDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 28,
    flexShrink: 1,
  },
  checkedInPrimaryBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkedInPrimaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  checkedInSecondaryBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  checkedInSecondaryBtnText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
