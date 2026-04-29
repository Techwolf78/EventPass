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
        Alert.alert('Check-in Success', result.message, [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      } else {
        Alert.alert('Check-in Failed', result.message, [
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
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubText}>Please enable camera access in settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.length > 0 && (
        <View style={styles.eventSelector}>
          <Text style={styles.selectorLabel}>Select Event:</Text>
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
                >
                  {event.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanText}>Position QR code in frame</Text>
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => setScanned(false)}
            disabled={processing}
          >
            <Ionicons name="camera-reverse" size={24} color="#007AFF" />
            <Text style={styles.rescanText}>
              {processing ? 'Processing...' : 'Scan Another'}
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
  eventSelector: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    zIndex: 10,
  },
  selectorLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  eventButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  eventButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  eventButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  eventButtonTextActive: {
    color: '#fff',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 32,
  },
  actionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  rescanButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  rescanText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

