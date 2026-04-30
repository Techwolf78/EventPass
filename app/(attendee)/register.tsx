import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { validateAndRegisterAttendee } from '@/utils/firestore';

export default function RegistrationScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');

  const handleRegister = async () => {
    if (!email) {
      setErrorTitle('Missing Email');
      setErrorMessage('Please enter your email address to proceed with registration.');
      setErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      let fcmToken = 'mocked-fcm-token-for-web-or-expo-go';

      const result = await validateAndRegisterAttendee(name, email, fcmToken);

      if (result.success) {
        if (result.qrToken) {
          router.replace({
            pathname: '/(attendee)/qr-pass',
            params: { qrToken: result.qrToken },
          });
        }
      } else {
        // Show specific error messages
        if (result.message === 'Not on the guest list') {
          setErrorTitle('Not Registered');
          setErrorMessage(
            `Sorry, the email "${email}" is not registered for this event. Please check your invitation or contact the event organizer.`
          );
        } else if (result.message?.includes('already registered')) {
          setErrorTitle('Already Registered');
          setErrorMessage('You have already registered for this event. Redirecting to your pass...');
          setTimeout(() => {
            router.replace({
              pathname: '/(attendee)/qr-pass',
              params: { qrToken: result.qrToken },
            });
          }, 1500);
          return;
        } else {
          setErrorTitle('Registration Failed');
          setErrorMessage(result.message || 'An unexpected error occurred. Please try again.');
        }
        setErrorModal(true);
      }
    } catch (error: any) {
      setErrorTitle('Error');
      setErrorMessage(error.message || 'Registration failed. Please try again.');
      setErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerBg}>
                <Ionicons name="person-add" size={40} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Get Your Pass</Text>
              <Text style={styles.headerSubtitle}>
                Register to receive your event pass
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <Text style={styles.stepIndicator}>Step 1 of 1</Text>
              <Text style={styles.formTitle}>Event Registration</Text>

              {/* Name Input */}
              {/* <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.optionalLabel}>(Optional)</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="#06b6d4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name (not required)"
                    placeholderTextColor="#b4b4b4"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                  />
                </View>
              </View> */}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color="#06b6d4" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#b4b4b4"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#06b6d4" />
                <Text style={styles.infoText}>
                  Your email will be used to verify your invitation
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Get My Pass</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footerText}>
              Only your email address is required to verify your registration
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Error Modal */}
      <Modal visible={errorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Error Icon */}
            <View style={styles.modalIconContainer}>
              {errorTitle === 'Not Registered' ? (
                <Ionicons name="alert-circle" size={64} color="#ef4444" />
              ) : errorTitle === 'Already Registered' ? (
                <Ionicons name="checkmark-circle" size={64} color="#10b981" />
              ) : (
                <Ionicons name="alert-circle" size={64} color="#f59e0b" />
              )}
            </View>

            {/* Error Title */}
            <Text style={styles.modalTitle}>{errorTitle}</Text>

            {/* Error Message */}
            <Text style={styles.modalMessage}>{errorMessage}</Text>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  headerBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    textTransform: 'lowercase',
    letterSpacing: 0,
  },
  requiredLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
    flex: 1,
  },
  button: {
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 20,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
