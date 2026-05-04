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
} from 'react-native';
import { getGuestList, addGuest, addGuestsFromCSV, GuestListItem } from '@/utils/firestore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { Ionicons } from '@expo/vector-icons';

export default function GuestListScreen() {
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

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(fileUri);

      // Parse CSV
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

      // Validate and prepare guest list
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

      // Show confirmation
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
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{guests.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Registered</Text>
          <Text style={[styles.statValue, styles.statValueGreen]}>
            {registeredCount}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, styles.statValueOrange]}>
            {pendingCount}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons
            name={showForm ? 'close' : 'add'}
            size={18}
            color="#fff"
          />
          <Text style={styles.buttonText}>
            {showForm ? 'Cancel' : 'Add Guest'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleUploadCSV}
        >
          <Ionicons name="cloud-upload" size={18} color="#fff" />
          <Text style={styles.buttonText}>Import CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Add Guest Form */}
      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            editable={!submitting}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting}
          />

          {/* Enrollment Type Selection */}
          <Text style={styles.fieldLabel}>Enrollment Type</Text>
          <View style={styles.buttonGroup}>
            {['masterclass', 'event'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  enrollmentType === type && styles.typeButtonActive,
                ]}
                onPress={() => setEnrollmentType(type as 'masterclass' | 'event')}
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    enrollmentType === type && styles.typeButtonTextActive,
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
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Guest</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guests..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Guest List */}
      <FlatList
        data={filteredGuests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.guestItem}>
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{item.name}</Text>
              <Text style={styles.guestEmail}>{item.email}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                item.status === 'registered'
                  ? styles.statusRegistered
                  : styles.statusPending,
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No guests found' : 'No guests yet'}
            </Text>
          </View>
        }
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  statValueGreen: {
    color: '#34C759',
  },
  statValueOrange: {
    color: '#FF9500',
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  form: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  guestItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  guestEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FFE5CC',
  },
  statusRegistered: {
    backgroundColor: '#D1F4E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  typeButtonActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
});

