import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';

export default function QRPassScreen() {
  const router = useRouter();
  const { qrToken } = useLocalSearchParams();
  const [qrRef, setQrRef] = useState<any>(null);

  if (!qrToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No QR token found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(attendee)/register')}
        >
          <Text style={styles.buttonText}>Back to Registration</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      if (qrRef) {
        qrRef.toDataURL((dataURL: string) => {
          // In a real app, you'd save this as an image first
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
    <View style={styles.container}>
      <Text style={styles.title}>Your Event Pass</Text>
      <Text style={styles.subtitle}>Show this QR code at check-in</Text>

      <View style={styles.qrContainer}>
        <QRCode
          ref={setQrRef}
          value={qrToken as string}
          size={250}
          color="#000"
          backgroundColor="#fff"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleViewAgenda}>
          <Text style={styles.buttonText}>View Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleShare}>
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>Keep this code safe. You&apos;ll need it to check in.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  qrContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 24,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 20,
  },
});
