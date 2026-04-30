import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/context/AuthContext';
import { validateAndCheckIn, getEvents } from '@/utils/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function QRScannerScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  useEffect(() => {
    requestPermission();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.log('Check-in result:', result.message);

      if (result.success) {
        Alert.alert('✓ Check-in Successful', result.message, [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      } else {
        Alert.alert('✗ Check-in Failed', result.message, [
          { text: 'Try Again', onPress: () => setScanned(false) },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Check-in failed', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera" size={48} color="#6366f1" />
        <Text style={styles.loadingText}>Requesting camera access...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorSubText}>
          Please enable camera access in your device settings to scan QR codes
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      {events.length > 0 && (
        <View style={styles.eventSelectorContainer}>
          <View style={styles.selectorHeader}>
            <Ionicons name="calendar" size={18} color="#6366f1" />
            <Text style={styles.selectorLabel}>Select Event</Text>
          </View>
          <View style={styles.eventButtons}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventButton,
                  selectedEventId === event.id && styles.eventButtonActive,
                ]}
                onPress={() => setSelectedEventId(event.id)}
              >
                <Text
                  style={[
                    styles.eventButtonText,
                    selectedEventId === event.id && styles.eventButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.cameraSection}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        <View style={styles.overlay} pointerEvents="none">
          {/* Scanner Frame */}
          <View style={styles.scannerContainer}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            {/* Center Pulse Indicator */}
            <View style={styles.pulseContainer}>
              <View style={styles.pulseCircle} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionBox}>
            <Ionicons name="qr-code" size={24} color="#fff" />
            <Text style={styles.scanText}>Position QR code in frame</Text>
          </View>
        </View>
      </View>

      {/* Action Container - When Scanned */}
      {scanned && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.rescanButton, processing && styles.rescanButtonDisabled]}
            onPress={() => setScanned(false)}
            disabled={processing}
          >
            <Ionicons
              name={processing ? 'hourglass' : 'camera-reverse'}
              size={22}
              color="#fff"
            />
            <Text style={styles.rescanText}>
              {processing ? 'Processing...' : 'Scan Next'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraSection: {
    flex: 1,
    position: 'relative',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
  },
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
  eventSelectorContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectorLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  eventButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  eventButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  eventButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  eventButtonTextActive: {
    color: '#fff',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#6366f1',
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
  pulseContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  instructionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scanText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  rescanButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  rescanButtonDisabled: {
    opacity: 0.6,
  },
  rescanText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

