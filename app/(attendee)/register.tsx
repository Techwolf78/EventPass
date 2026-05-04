import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { validateAndRegisterAttendee, checkIfEmailInGuestList } from '@/utils/firestore';

export default function RegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [guestConfirmed, setGuestConfirmed] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setGuestConfirmed(false);

    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    if (text.length >= 5) {
      setCheckingEmail(true);
      emailCheckTimeout.current = setTimeout(async () => {
        try {
          const result = await checkIfEmailInGuestList(text);
          setGuestConfirmed(result.exists);
        } catch (error) {
          console.error('Error checking email:', error);
          setGuestConfirmed(false);
        } finally {
          setCheckingEmail(false);
        }
      }, 500);
    }
  };

  const getErrorIconName = () => {
    if (errorTitle === 'Not Registered') {
      return 'alert-circle';
    } else if (errorTitle === 'Already Registered') {
      return 'checkmark-circle';
    } else {
      return 'alert-circle';
    }
  };

  const getErrorIconColor = () => {
    if (errorTitle === 'Not Registered') {
      return '#ef4444';
    } else if (errorTitle === 'Already Registered') {
      return '#10b981';
    } else {
      return '#f59e0b';
    }
  };

  const handleRegister = async () => {
    if (!name) {
      setErrorTitle('Missing Name');
      setErrorMessage('Please enter your full name to proceed with registration.');
      setErrorModal(true);
      return;
    }

    if (!email) {
      setErrorTitle('Missing Email');
      setErrorMessage('Please enter your work email address to proceed with registration.');
      setErrorModal(true);
      return;
    }

    if (!guestConfirmed) {
      setErrorTitle('Email Not Verified');
      setErrorMessage('Your email is not in our guest list. Please check and try again.');
      setErrorModal(true);
      return;
    }

    if (!department) {
      setErrorTitle('Missing Department');
      setErrorMessage('Please enter your department to proceed with registration.');
      setErrorModal(true);
      return;
    }

    if (!password) {
      setErrorTitle('Missing Password');
      setErrorMessage('Please enter a password to secure your account.');
      setErrorModal(true);
      return;
    }

    if (password.length < 6) {
      setErrorTitle('Weak Password');
      setErrorMessage('Password must be at least 6 characters long.');
      setErrorModal(true);
      return;
    }

    if (password !== confirmPassword) {
      setErrorTitle('Password Mismatch');
      setErrorMessage('Passwords do not match. Please try again.');
      setErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const fcmToken = 'mocked-fcm-token-for-web-or-expo-go';

      const result = await validateAndRegisterAttendee(name, email, fcmToken, password, department);

      if (result.success) {
        if (result.qrToken) {
          router.replace({
            pathname: '/(attendee)/qr-pass',
            params: { qrToken: result.qrToken },
          });
        }
      } else {
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
      <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerBg}>
                <Ionicons name="person-add" size={40} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Register</Text>
              <Text style={styles.headerSubtitle}>
                INNOVATESUMMIT 2025
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <Text style={styles.stepIndicator}>Step 1 of 1</Text>
              <Text style={styles.formTitle}>Registration</Text>

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="#7c3aed" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Priya Sharma"
                    placeholderTextColor="#b4b4b4"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Work Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Work Email <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color="#7c3aed" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="priya@company.in"
                    placeholderTextColor="#b4b4b4"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading && !checkingEmail}
                  />
                </View>
              </View>

              {/* Department Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="briefcase" size={20} color="#7c3aed" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Engineering"
                    placeholderTextColor="#b4b4b4"
                    value={department}
                    onChangeText={setDepartment}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#7c3aed" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password (min. 6 chars)"
                    placeholderTextColor="#b4b4b4"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#7c3aed" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#b4b4b4"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Email Checking Status */}
              {checkingEmail && email.length > 0 && (
                <View style={styles.checkingBox}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                  <Text style={styles.checkingText}>Verifying email...</Text>
                </View>
              )}

              {/* Guest Confirmed Message */}
              {guestConfirmed && !checkingEmail && (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.successText}>
                    Guest confirmed
                  </Text>
                </View>
              )}

              {/* Email Not Found Message */}
              {!guestConfirmed && !checkingEmail && email.length >= 5 && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text style={styles.errorBoxText}>
                    Email not found in guest list
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, (loading || !guestConfirmed) && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading || !guestConfirmed}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Complete Registration</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                Your information will be used for event purposes only
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                disabled={loading}
                style={styles.signInContainer}
              >
                <Text style={styles.signInText}>
                  Already have an account?{' '}
                  <Text style={styles.signInLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Error Modal */}
      <Modal visible={errorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name={getErrorIconName() as any} size={64} color={getErrorIconColor()} />
            </View>
            <Text style={styles.modalTitle}>{errorTitle}</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
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
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    fontSize: 14,
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
    color: '#7c3aed',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  successBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  checkingBox: {
    backgroundColor: '#f5f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#5b21b6',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorBoxText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#7c3aed',
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
  footerContainer: {
    alignItems: 'center',
  },
  signInContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  signInLink: {
    color: '#fff',
    fontWeight: '700',
  },
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
    width: '90%',
    maxWidth: 400,
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
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
