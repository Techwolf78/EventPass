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

const TAB_BAR_HEIGHT = 80; // Adjust this based on your tab bar height

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
    if (processing) return;
    if (!selectedEventId) {
      Alert.alert('No Event Selected', 'Please ensure an event is selected before scanning.');
      return;
    }

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
        {events.length > 0 ? (
          <View style={styles.eventBadge}>
            <Ionicons name="calendar" size={14} color="#8B5CF6" />
            <Text style={styles.eventBadgeText} numberOfLines={1}>
              {events.find((e) => e.id === selectedEventId)?.title || 'Event'}
            </Text>
          </View>
        ) : (
          <View style={[styles.eventBadge, { borderColor: '#ef4444' }]}>
            <Ionicons name="alert-circle" size={14} color="#ef4444" />
            <Text style={[styles.eventBadgeText, { color: '#ef4444' }]}>No Events</Text>
          </View>
        )}
      </View>

      {/* Camera Section */}
      <View style={styles.cameraSection}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : (event) => {
            console.log('Barcode scanned:', event.data);
            handleBarCodeScanned(event);
          }}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
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

          <View style={[styles.instructionBox, { bottom: 60 + TAB_BAR_HEIGHT }]}>
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
        <View style={[styles.recentSection, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}>
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
    backgroundColor: '#0f172a', // slate-900
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
    backgroundColor: '#0f172a',
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
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
    letterSpacing: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34d399',
    textTransform: 'uppercase',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: '#334155',
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a78bfa',
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
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Confirmation Section
  confirmSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  confirmCardFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  confirmIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  confirmEmail: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  confirmStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  scanNextBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  scanNextBtnDisabled: {
    opacity: 0.5,
  },
  scanNextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Recent Scans
  recentSection: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#a78bfa',
  },
  recentList: {
    maxHeight: 200,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  recentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recentAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  recentTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
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