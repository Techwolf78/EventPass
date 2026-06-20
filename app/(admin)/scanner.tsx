import React, { useEffect, useState, useCallback } from 'react';
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

  const loadEvents = useCallback(async () => {
    const eventsList = await getEvents();
    if (eventsList.length > 0) {
      setSelectedEventId(eventsList[0].id);
      setEvents(eventsList);
    }
  }, []);

  useEffect(() => {
    requestPermission();
    loadEvents();
  }, [requestPermission, loadEvents]);

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
          id: `${Date.now()}-${Math.random()}`,
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
          id: `${Date.now()}-${Math.random()}`,
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
        <Ionicons name="camera" size={48} color="#000000" />
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
            <Ionicons name="qr-code" size={20} color="#000000" />
            <Text style={styles.scanText}>Point camera at attendee&apos;s QR pass</Text>
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
              { backgroundColor: lastScan.success ? '#F3F4F6' : '#F9FAFB' },
            ]}>
              <Ionicons
                name={lastScan.success ? 'checkmark' : 'close'}
                size={28}
                color={lastScan.success ? '#000000' : '#6B7280'}
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
                  { backgroundColor: scan.status === 'success' ? '#F3F4F6' : '#F9FAFB' },
                ]}>
                  <Text style={[
                    styles.recentAvatarText,
                    { color: scan.status === 'success' ? '#000000' : '#6B7280' },
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
                  { backgroundColor: scan.status === 'success' ? '#F3F4F6' : '#F9FAFB' },
                ]}>
                  <Ionicons
                    name={scan.status === 'success' ? 'checkmark' : 'close'}
                    size={14}
                    color={scan.status === 'success' ? '#000000' : '#6B7280'}
                  />
                  <Text style={[
                    styles.recentStatusText,
                    { color: scan.status === 'success' ? '#000000' : '#6B7280' },
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    flexShrink: 1,
  },
  // Loading/Error states
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: -4,
    left: -4,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: -4,
    right: -4,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: -4,
    left: -4,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: -4,
    right: -4,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scanText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '500',
  },
  // Confirmation Section
  confirmSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  confirmCardSuccess: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  confirmCardFailed: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  confirmIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  confirmEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '400',
  },
  confirmStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  scanNextBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scanNextBtnDisabled: {
    opacity: 0.5,
  },
  scanNextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Recent Scans
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  recentList: {
    maxHeight: 150,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recentAvatarText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  recentTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '400',
  },
  recentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recentStatusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});