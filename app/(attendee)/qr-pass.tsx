import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { getCheckInStatus, CheckInStatusResult } from '@/utils/firestore';

const { width } = Dimensions.get('window');

export default function QRPassScreen() {
  const router = useRouter();
  const { qrToken } = useLocalSearchParams();
  const [qrRef, setQrRef] = useState<any>(null);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatusResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckInStatus = async () => {
      if (!qrToken) {
        setLoading(false);
        return;
      }
      try {
        // Check if already checked in for ANY event
        const status = await getCheckInStatus(qrToken as string);
        setCheckInStatus(status);
      } catch (error) {
        console.error('Error fetching check-in status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckInStatus();
  }, [qrToken]);

  if (!qrToken) {
    return (
      <LinearGradient colors={['#f43f5e', '#e11d48']} style={styles.gradient}>
        <View style={styles.errorContainer}>
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

  // Show loading state while fetching check-in status
  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Checking your status...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Show "Already Checked In" message
  if (checkInStatus?.hasCheckedIn) {
    return (
      <LinearGradient colors={['#10b981', '#059669']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={48} color="#fff" />
            <Text style={styles.headerTitle}>Already Checked In!</Text>
            <Text style={styles.headerSubtitle}>
              Welcome to the event
            </Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            {/* Success Icon */}
            <View style={styles.successContainer}>
              <View style={styles.successIconBg}>
                <Ionicons name="checkmark" size={60} color="#fff" />
              </View>
              <Text style={styles.successTitle}>You're All Set!</Text>
              <Text style={styles.successMessage}>
                You have already checked in for this event
              </Text>
            </View>

            {/* Details Box */}
            <View style={styles.detailsBox}>
              <View style={styles.detailItem}>
                <View style={styles.detailLabel}>
                  <Ionicons name="person" size={20} color="#10b981" />
                  <Text style={styles.detailLabelText}>Name</Text>
                </View>
                <Text style={styles.detailValue}>{checkInStatus.candidateName}</Text>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailLabel}>
                  <Ionicons name="mail" size={20} color="#10b981" />
                  <Text style={styles.detailLabelText}>Email</Text>
                </View>
                <Text style={styles.detailValue}>{checkInStatus.candidateEmail}</Text>
              </View>

              {checkInStatus.checkedInAt && (
                <View style={styles.detailItem}>
                  <View style={styles.detailLabel}>
                    <Ionicons name="time" size={20} color="#10b981" />
                    <Text style={styles.detailLabelText}>Check-In Time</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {checkInStatus.checkedInAt instanceof Object && 'toDate' in checkInStatus.checkedInAt
                      ? checkInStatus.checkedInAt.toDate().toLocaleString()
                      : 'Today'}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.checkedInPrimaryBtn} onPress={() => router.push('/(attendee)/agenda')}>
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

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            Enjoy the event! If you need any assistance, contact the organizers.
          </Text>
        </ScrollView>
      </LinearGradient>
    );
  }

  const handleShare = async () => {
    try {
      if (qrRef) {
        qrRef.toDataURL((dataURL: string) => {
          Sharing.shareAsync(dataURL, {
            mimeType: 'image/png',
            dialogTitle: 'Share your EventPass QR Code',
          });
        });
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  const handleViewAgenda = () => {
    router.push('/(attendee)/agenda');
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="ticket-sharp" size={48} color="#fff" />
          <Text style={styles.headerTitle}>Your Event Pass</Text>
          <Text style={styles.headerSubtitle}>Ready to check in!</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* QR Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrBackground}>
              <QRCode
                ref={setQrRef}
                value={qrToken as string}
                size={240}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.qrLabel}>Scan at entrance</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Pass Generated</Text>
              <Text style={styles.infoSubtitle}>
                Your unique QR code is ready
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleViewAgenda}>
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>View Agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#667eea" />
              <Text style={styles.secondaryBtnText}>Share Pass</Text>
            </TouchableOpacity>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.tipItem}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>1</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Save your pass</Text>
                <Text style={styles.tipDesc}>Screenshot this screen for backup</Text>
              </View>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipNumber}>
                <Text style={styles.tipNumberText}>2</Text>
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Arrive early</Text>
                <Text style={styles.tipDesc}>Queue starts 15 mins before event</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Don&apos;t lose this pass. You&apos;ll need it to check in at the event.
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
    paddingHorizontal: 20,
    paddingTop: 40,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  qrBackground: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  infoBadge: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '500',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryBtn: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryBtnText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  tipsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 20,
    fontWeight: '500',
  },
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
  detailsBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 28,
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

