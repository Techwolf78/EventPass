import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getGuestList, addGuest, addGuestsFromCSV, GuestListItem } from '@/utils/firestore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { Ionicons } from '@expo/vector-icons';

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function GuestListScreen() {
  const insets = useSafeAreaInsets();
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'masterclass' | 'event'>('event');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    const guestList = await getGuestList();
    setGuests(guestList);
    setLoading(false);
  };

  const handleAddGuest = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const result = await addGuest(name, email, enrollmentType);
    Alert.alert('Result', result.message);

    if (result.success) {
      setName('');
      setEmail('');
      setEnrollmentType('event');
      setShowForm(false);
      loadGuests();
    }
    setSubmitting(false);
  };

  const handleUploadCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;

      if (!fileName.endsWith('.csv')) {
        Alert.alert('Error', 'Please upload a CSV file');
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri);

      const parseResult = Papa.parse(fileContent, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
      });

      if (parseResult.errors.length > 0) {
        Alert.alert('CSV Parse Error', 'Invalid CSV format');
        return;
      }

      const guests = (parseResult.data as any[])
        .filter((row) => row.name && row.email && row.enrollmentType)
        .map((row) => {
          const enrollmentTypeLower = row.enrollmentType.toLowerCase().trim();
          return {
            name: row.name,
            email: row.email,
            enrollmentType: (enrollmentTypeLower === 'masterclass' ? 'masterclass' : 'event') as 'masterclass' | 'event',
          };
        });

      if (guests.length === 0) {
        Alert.alert('Error', 'No valid guest entries found in CSV');
        return;
      }

      Alert.alert(
        'Confirm Upload',
        `Upload ${guests.length} guests from CSV?`,
        [
          { text: 'Cancel' },
          {
            text: 'Upload',
            onPress: async () => {
              setLoading(true);
              const uploadResult = await addGuestsFromCSV(guests);
              Alert.alert(
                uploadResult.success ? 'Success' : 'Partial Success',
                uploadResult.message
              );
              loadGuests();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload CSV');
    }
  };

  const filteredGuests = guests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const registeredCount = guests.filter((g) => g.status === 'registered').length;
  const pendingCount = guests.filter((g) => g.status === 'pending').length;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Guest List</Text>
            <Text style={styles.headerSubtitle}>ADMIN • INNOVATESUMMIT</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{guests.length}</Text>
            <Text style={styles.statLabel}>Total guests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberGreen]}>{registeredCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelGreen]}>Registered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberOrange]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelOrange]}>Pending</Text>
          </View>
        </View>

        {/* Add Guest Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Guest</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              editable={!submitting}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Email Address"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
            <Text style={styles.fieldLabel}>ENROLLMENT TYPE</Text>
            <View style={styles.enrollmentRow}>
              {['masterclass', 'event'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.enrollmentBtn,
                    enrollmentType === type && styles.enrollmentBtnActive,
                  ]}
                  onPress={() => setEnrollmentType(type as 'masterclass' | 'event')}
                  disabled={submitting}
                >
                  <Text style={[
                    styles.enrollmentBtnText,
                    enrollmentType === type && styles.enrollmentBtnTextActive,
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleAddGuest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Guest</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Upload CSV Card */}
        <TouchableOpacity style={styles.uploadCard} onPress={handleUploadCSV}>
          <View style={styles.uploadContent}>
            <View style={styles.uploadIconBg}>
              <Ionicons name="cloud-upload" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.uploadTextBlock}>
              <Text style={styles.uploadTitle}>Upload CSV file</Text>
              <Text style={styles.uploadSubtitle}>name, email columns required</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALL GUESTS</Text>
          <Text style={styles.sectionCount}>{filteredGuests.length}</Text>
        </View>

        {/* Guest List */}
        <View style={styles.listContainer}>
          {filteredGuests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No guests found' : 'No guests yet'}
              </Text>
            </View>
          ) : (
            filteredGuests.map((item) => (
              <View key={item.id} style={styles.guestItem}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.guestEmail} numberOfLines={1}>{item.email}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  item.status === 'registered' ? styles.statusRegistered : styles.statusPending,
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'registered' ? styles.statusTextRegistered : styles.statusTextPending,
                  ]}>
                    {item.status === 'registered' ? 'Registered' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4FA',
  },
  scrollContent: {
    paddingBottom: 20,
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
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  statNumberGreen: {
    color: '#10B981',
  },
  statNumberOrange: {
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  statLabelGreen: {
    color: '#10B981',
  },
  statLabelOrange: {
    color: '#F59E0B',
  },
  // Form Card
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 14,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 10,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  enrollmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  enrollmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  enrollmentBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  enrollmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  enrollmentBtnTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Upload Card
  uploadCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c4b5fd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextBlock: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#F5F4FA',
    paddingVertical: 8,
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
  // Guest List
  listContainer: {
    paddingHorizontal: 20,
  },
  guestItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  guestInfo: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  guestEmail: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },
  statusRegistered: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextRegistered: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
});
