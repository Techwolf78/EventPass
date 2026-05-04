import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/context/AuthContext';
import { validateAndCheckIn, getEvents } from '@/utils/firestore';
import { Ionicons } from '@expo/vector-icons';

interface RecentScan {
  id: string;
  name: string;
  time: string;
  status: 'success' | 'failed';
}

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export default function QRScannerScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scannerSize = Math.min(width * 0.65, 260);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [lastScan, setLastScan] = useState<{ name: string; email: string; success: boolean; message: string } | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  useEffect(() => {
    requestPermission();
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const eventsList = await getEvents();
    if (eventsList.length > 0) {
      setSelectedEventId(eventsList[0].id);
      setEvents(eventsList);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (processing || !selectedEventId) return;

    setProcessing(true);
    setScanned(true);

    try {
      const result = await validateAndCheckIn(data, selectedEventId, user?.uid || '');
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const scanName = result.candidate?.name || 'Attendee';
      setLastScan({
        name: scanName,
        email: result.candidate?.email || '',
        success: result.success,
        message: result.message || '',
      });

      setRecentScans((prev) => [
        {
          id: Date.now().toString(),
          name: scanName,
          time: now,
          status: (result.success ? 'success' : 'failed') as 'success' | 'failed',
        },
        ...prev,
      ].slice(0, 10));

      Alert.alert(result.success ? '✓ Check-in Successful' : '✗ Check-in Failed', result.message, [
        { text: 'OK' },
      ]);
    } catch (error: any) {
      setLastScan({
        name: 'Unknown',
        email: '',
        success: false,
        message: error.message || 'Check-in failed',
      });
      setRecentScans((prev) => [
        {
          id: Date.now().toString(),
          name: 'Unknown',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'failed' as const,
        },
        ...prev,
      ].slice(0, 10));

      Alert.alert('Error', error.message || 'Check-in failed', [
        { text: 'Try Again' },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setLastScan(null);
  };

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="camera" size={48} color="#8B5CF6" />
        <Text style={styles.loadingText}>Requesting camera access...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorSubText}>
          Please enable camera access in your device settings to scan QR codes
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Scan Entry</Text>
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerSubtitle}>ADMIN • GATE 1</Text>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        {events.length > 0 && (
          <View style={styles.eventBadge}>
            <Ionicons name="calendar" size={14} color="#8B5CF6" />
            <Text style={styles.eventBadgeText} numberOfLines={1}>
              {events.find((e) => e.id === selectedEventId)?.title || 'Event'}
            </Text>
          </View>
        )}
      </View>

      {/* Camera Section */}
      <View style={styles.cameraSection}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.scannerContainer}>
            <View style={[styles.scannerFrame, { width: scannerSize, height: scannerSize }]}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.instructionBox}>
            <Ionicons name="qr-code" size={20} color="#fff" />
            <Text style={styles.scanText}>Point camera at attendee's QR pass</Text>
          </View>
        </View>
      </View>

      {/* Confirmation Card */}
      {scanned && lastScan && (
        <View style={styles.confirmSection}>
          <View style={[
            styles.confirmCard,
            lastScan.success ? styles.confirmCardSuccess : styles.confirmCardFailed,
          ]}>
            <View style={[
              styles.confirmIconBg,
              { backgroundColor: lastScan.success ? '#D1FAE5' : '#FEE2E2' },
            ]}>
              <Ionicons
                name={lastScan.success ? 'checkmark' : 'close'}
                size={28}
                color={lastScan.success ? '#10B981' : '#EF4444'}
              />
            </View>
            <View style={styles.confirmInfo}>
              <Text style={styles.confirmName}>{lastScan.name}</Text>
              {lastScan.email ? (
                <Text style={styles.confirmEmail}>{lastScan.email}</Text>
              ) : null}
              <Text style={[
                styles.confirmStatus,
                { color: lastScan.success ? '#10B981' : '#EF4444' },
              ]}>
                {lastScan.success ? 'Check-in successful' : 'Check-in failed'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.scanNextBtn, processing && styles.scanNextBtnDisabled]}
            onPress={resetScanner}
            disabled={processing}
          >
            <Ionicons
              name={processing ? 'hourglass' : 'scan'}
              size={20}
              color="#fff"
            />
            <Text style={styles.scanNextBtnText}>
              {processing ? 'Processing...' : 'Scan Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT SCANS</Text>
            <Text style={styles.sectionCount}>{recentScans.length}</Text>
          </View>
          <ScrollView
            style={styles.recentList}
            showsVerticalScrollIndicator={false}
          >
            {recentScans.map((scan) => (
              <View key={scan.id} style={styles.recentItem}>
                <View style={[
                  styles.recentAvatar,
                  { backgroundColor: scan.status === 'success' ? '#D1FAE5' : '#FEE2E2' },
                ]}>
                  <Text style={[
                    styles.recentAvatarText,
                    { color: scan.status === 'success' ? '#065F46' : '#991B1B' },
                  ]}>
                    {getInitials(scan.name)}
                  </Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName} numberOfLines={1}>{scan.name}</Text>
                  <Text style={styles.recentTime}>{scan.time}</Text>
                </View>
                <View style={[
                  styles.recentStatus,
                  { backgroundColor: scan.status === 'success' ? '#D1FAE5' : '#FEE2E2' },
                ]}>
                  <Ionicons
                    name={scan.status === 'success' ? 'checkmark' : 'close'}
                    size={14}
                    color={scan.status === 'success' ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[
                    styles.recentStatusText,
                    { color: scan.status === 'success' ? '#065F46' : '#991B1B' },
                  ]}>
                    {scan.status === 'success' ? 'In' : 'Fail'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  cameraSection: {
    flex: 1,
    minHeight: 300,
    position: 'relative',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F4FA',
    paddingHorizontal: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    maxWidth: 140,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
    flexShrink: 1,
  },
  // Loading/Error states
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  // Camera
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingVertical: 40,
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#F97316',
  },
  topLeft: {
    top: -8,
    left: -8,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -8,
    right: -8,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -8,
    left: -8,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -8,
    right: -8,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    position: 'absolute',
    bottom: 60,
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Confirmation Section
  confirmSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  confirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  confirmCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  confirmCardFailed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  confirmIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  confirmEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  confirmStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  scanNextBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanNextBtnDisabled: {
    opacity: 0.6,
  },
  scanNextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Recent Scans
  recentSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  recentList: {
    maxHeight: 200,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentAvatarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  recentTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  recentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  recentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
