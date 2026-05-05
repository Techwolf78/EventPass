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
  const [successModal, setSuccessModal] = useState(false);
  const [successQrToken, setSuccessQrToken] = useState<string>('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const emailCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced email check function
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setGuestConfirmed(false);

    // Clear previous timeout
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    // Check if email is fully formatted: user@domain.xx (at least 2-3 chars after dot)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(text)) {
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
      }, 500); // 500ms debounce
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

    // All validations passed, show password setup modal
    setPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setErrorTitle('Missing Password');
      setErrorMessage('Please enter a password to proceed.');
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

    setPasswordModal(false);
    setLoading(true);

    try {
      let fcmToken = 'mocked-fcm-token-for-web-or-expo-go';

      const result = await validateAndRegisterAttendee(
        name,
        email,
        fcmToken,
        password,
        department
      );

      if (result.success) {
        if (result.qrToken) {
          // Store QR token and show success modal
          setSuccessQrToken(result.qrToken);
          setSuccessModal(true);
          
          // Auto-redirect after 3 seconds
          setTimeout(() => {
            proceedToDashboard(result.qrToken || '');
          }, 3000);
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
              pathname: '/(attendee)/agenda',
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

  const proceedToDashboard = (qrToken: string) => {
    setSuccessModal(false);
    router.replace({
      pathname: '/(attendee)/agenda',
      params: { qrToken },
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.gradient}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            {/* Header with Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerBg}>
                <Ionicons name="person-add" size={40} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Register</Text>
              <Text style={styles.headerSubtitle}>
                EventPass PrivateSummit
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
                  <Ionicons name="person" size={20} color="#06b6d4" style={styles.inputIcon} />
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

              {/* Work Email or Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email <Text style={styles.requiredLabel}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color="#06b6d4" style={styles.inputIcon} />
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
                  <Ionicons name="briefcase" size={20} color="#06b6d4" style={styles.inputIcon} />
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

              {/* Email Checking Status */}
              {checkingEmail && email.length > 0 && (
                <View style={styles.checkingBox}>
                  <ActivityIndicator size="small" color="#06b6d4" />
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
              {!guestConfirmed && !checkingEmail && /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) && (
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

      {/* Password Setup Modal */}
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.passwordModalOverlay}>
          <View style={[styles.passwordModalContent, { paddingBottom: insets.bottom + 40 }]}>
            {/* Header */}
            <View style={styles.passwordModalHeader}>
              <View style={styles.passwordIconBg}>
                <Ionicons name="lock-closed" size={32} color="#fff" />
              </View>
              <Text style={styles.passwordModalTitle}>Set Your Password</Text>
              <Text style={styles.passwordModalSubtitle}>
                Create a secure password to access your account
              </Text>
            </View>

            {/* Password Input */}
            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordLabel}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#06b6d4" style={styles.passwordInputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password (min. 6 characters)"
                  placeholderTextColor="#b4b4b4"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.passwordInputGroup}>
              <Text style={styles.passwordLabel}>Confirm Password</Text>
              <View style={styles.passwordInputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#06b6d4" style={styles.passwordInputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor="#b4b4b4"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.passwordModalButtons}>
              <TouchableOpacity
                style={styles.passwordCancelButton}
                onPress={() => {
                  setPasswordModal(false);
                  setPassword('');
                  setConfirmPassword('');
                }}
                disabled={loading}
              >
                <Text style={styles.passwordCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.passwordSubmitButton, loading && styles.passwordSubmitButtonDisabled]}
                onPress={handlePasswordSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.passwordSubmitButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={errorModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Error Icon */}
            <View style={styles.modalIconContainer}>
              <Ionicons name={getErrorIconName() as any} size={64} color={getErrorIconColor()} />
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

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            {/* Success Animation */}
            <View style={styles.successIconContainer}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={60} color="#fff" />
              </View>
            </View>

            {/* Success Title */}
            <Text style={styles.successModalTitle}>Registration Complete!</Text>

            {/* Success Message */}
            <Text style={styles.successModalMessage}>
              Email verified ✓
            </Text>
            <Text style={styles.successModalSubtext}>
              {email}
            </Text>

            {/* Proceed Button */}
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => proceedToDashboard(successQrToken)}
            >
              <Text style={styles.successModalButtonText}>View Dashboard</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {/* Auto-redirect Text */}
            <View style={styles.autoRedirectContainer}>
              <ActivityIndicator size="small" color="#06b6d4" />
              <Text style={styles.autoRedirectText}>Redirecting in 3 seconds...</Text>
            </View>
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
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  stepIndicator: {
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
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
  },
  checkingBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
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
    color: '#0369a1',
    fontWeight: '500',
    flex: 1,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
    textAlign: 'center',
  },
  successModalSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  successModalButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  autoRedirectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoRedirectText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openingDashboardText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Password Modal Styles
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  passwordModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  passwordModalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  passwordIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  passwordModalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  passwordInputGroup: {
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  passwordInputIcon: {
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  passwordModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  passwordCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  passwordCancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  passwordSubmitButton: {
    flex: 1,
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  passwordSubmitButtonDisabled: {
    opacity: 0.6,
  },
  passwordSubmitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
