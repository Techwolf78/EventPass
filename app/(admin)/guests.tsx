import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getGuestList,
  addGuest,
  addGuestsFromCSV,
  getCheckedInCandidateIds,
  GuestListItem,
} from '@/utils/firestore';
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

type GuestStatus = 'arrived' | 'unarrived' | 'pending';

type FilterStatus = 'all' | GuestStatus;

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    const [guestList, checkIns] = await Promise.all([
      getGuestList(),
      getCheckedInCandidateIds(),
    ]);
    setGuests(guestList);
    setCheckedInIds(new Set(checkIns));
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
            enrollmentType: (enrollmentTypeLower === 'masterclass' ? 'masterclass' : 'event') as
              | 'masterclass'
              | 'event',
          };
        });

      if (guests.length === 0) {
        Alert.alert('Error', 'No valid guest entries found in CSV');
        return;
      }

      Alert.alert('Confirm Upload', `Upload ${guests.length} guests from CSV?`, [
        { text: 'Cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            setLoading(true);
            const uploadResult = await addGuestsFromCSV(guests);
            Alert.alert(uploadResult.success ? 'Success' : 'Partial Success', uploadResult.message);
            loadGuests();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload CSV');
    }
  };

  const getGuestStatus = (guest: GuestListItem): GuestStatus => {
    if (guest.status === 'registered') {
      return checkedInIds.has(guest.id) ? 'arrived' : 'unarrived';
    }
    return 'pending';
  };

  const filteredGuests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(normalizedQuery) ||
        guest.email.toLowerCase().includes(normalizedQuery);
      if (!matchesSearch) return false;

      if (filterStatus === 'all') return true;
      return getGuestStatus(guest) === filterStatus;
    });
  }, [guests, searchQuery, filterStatus, checkedInIds]);

  const arrivedCount = guests.filter((guest) => getGuestStatus(guest) === 'arrived').length;
  const unarrivedCount = guests.filter((guest) => getGuestStatus(guest) === 'unarrived').length;
  const pendingCount = guests.filter((guest) => getGuestStatus(guest) === 'pending').length;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Guest List</Text>
          <Text style={styles.headerSubtitle}>ADMIN • INNOVATESUMMIT</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
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
          <Text style={[styles.statNumber, styles.statNumberGreen]}>{arrivedCount}</Text>
          <Text style={[styles.statLabel, styles.statLabelGreen]}>Arrived</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberOrange]}>{unarrivedCount}</Text>
          <Text style={[styles.statLabel, styles.statLabelOrange]}>Unarrived</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.statNumberBlue]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, styles.statLabelBlue]}>Pending</Text>
        </View>
      </View>

      {/* Radio Button Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterOption, filterStatus === 'all' && styles.filterOptionActive]}
          onPress={() => setFilterStatus('all')}
          activeOpacity={0.7}
        >
          <View style={[styles.radioCircle, filterStatus === 'all' && styles.radioCircleActive]}>
            {filterStatus === 'all' && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterStatus === 'arrived' && styles.filterOptionActive]}
          onPress={() => setFilterStatus('arrived')}
          activeOpacity={0.7}
        >
          <View style={[styles.radioCircle, filterStatus === 'arrived' && styles.radioCircleActive]}>
            {filterStatus === 'arrived' && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.filterText, filterStatus === 'arrived' && styles.filterTextActive]}>
            Arrived
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterStatus === 'unarrived' && styles.filterOptionActive]}
          onPress={() => setFilterStatus('unarrived')}
          activeOpacity={0.7}
        >
          <View style={[styles.radioCircle, filterStatus === 'unarrived' && styles.radioCircleActive]}>
            {filterStatus === 'unarrived' && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.filterText, filterStatus === 'unarrived' && styles.filterTextActive]}>
            Unarrived
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterStatus === 'pending' && styles.filterOptionActive]}
          onPress={() => setFilterStatus('pending')}
          activeOpacity={0.7}
        >
          <View style={[styles.radioCircle, filterStatus === 'pending' && styles.radioCircleActive]}>
            {filterStatus === 'pending' && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.filterText, filterStatus === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
      </View>

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
                  style={[styles.enrollmentBtn, enrollmentType === type && styles.enrollmentBtnActive]}
                  onPress={() => setEnrollmentType(type as 'masterclass' | 'event')}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.enrollmentBtnText,
                      enrollmentType === type && styles.enrollmentBtnTextActive,
                    ]}
                  >
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
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Add Guest</Text>}
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
              <Text style={styles.uploadSubtitle}>name, email, enrollmentType (masterclass/event)</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>

        {/* Section Header with active filter display */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filterStatus === 'all'
              ? 'ALL GUESTS'
              : filterStatus === 'arrived'
              ? 'ARRIVED GUESTS'
              : filterStatus === 'unarrived'
              ? 'UNARRIVED GUESTS'
              : 'PENDING GUESTS'}
          </Text>
          <Text style={styles.sectionCount}>{filteredGuests.length}</Text>
        </View>

        {/* Guest List */}
        <View style={styles.listContainer}>
          {filteredGuests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No guests found' : `No ${filterStatus === 'all' ? '' : filterStatus} guests`}
              </Text>
            </View>
          ) : (
            filteredGuests.map((item) => {
              const status = getGuestStatus(item);
              return (
                <View key={item.id} style={styles.guestItem}>
                  <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.guestEmail} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      status === 'arrived'
                        ? styles.statusArrived
                        : status === 'unarrived'
                        ? styles.statusUnarrived
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        status === 'arrived'
                          ? styles.statusTextArrived
                          : status === 'unarrived'
                          ? styles.statusTextUnarrived
                          : styles.statusTextPending,
                      ]}
                    >
                      {status === 'arrived' ? 'Arrived' : status === 'unarrived' ? 'Unarrived' : 'Pending'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900
  },
  scrollContent: {
    paddingBottom: 100, // accommodate tab bar
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
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
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
    marginTop: 4,
    letterSpacing: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#a78bfa',
  },
  statNumberGreen: {
    color: '#34d399',
  },
  statNumberOrange: {
    color: '#fbbf24',
  },
  statNumberBlue: {
    color: '#60a5fa',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statLabelGreen: {
    color: '#34d399',
  },
  statLabelOrange: {
    color: '#fbbf24',
  },
  statLabelBlue: {
    color: '#60a5fa',
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 30,
    padding: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#a78bfa',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#a78bfa',
  },
  // Form Card
  formCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 14,
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: '#f8fafc',
    marginBottom: 12,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  enrollmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  enrollmentBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  enrollmentBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8b5cf6',
  },
  enrollmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  enrollmentBtnTextActive: {
    color: '#a78bfa',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  // Upload Card
  uploadCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  uploadIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextBlock: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '600',
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
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
  // Guest List
  listContainer: {
    paddingHorizontal: 20,
  },
  guestItem: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  guestInfo: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  guestEmail: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
    borderWidth: 1,
  },
  statusArrived: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusUnarrived: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusPending: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusTextArrived: {
    color: '#34d399',
  },
  statusTextUnarrived: {
    color: '#fbbf24',
  },
  statusTextPending: {
    color: '#60a5fa',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '700',
  },
});
