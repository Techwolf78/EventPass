import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import {
  subscribeToAttendanceCount,
  subscribeToCheckInLog,
  AttendanceRecord,
  Candidate,
  getCandidateById,
  getEvents,
  EventData,
} from '@/utils/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

export default function AdminPanelScreen() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [count, setCount] = useState(0);
  const [checkInLog, setCheckInLog] = useState<AttendanceRecord[]>([]);
  const [candidates, setCandidates] = useState<{
    [key: string]: Partial<Candidate>;
  }>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const eventsList = await getEvents();
    setEvents(eventsList);
    if (eventsList.length > 0) {
      setSelectedEventId(eventsList[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedEventId) return;

    // Reset state for the new event, but keep candidate cache
    setCount(0);
    setCheckInLog([]);

    const unsubscribeCount = subscribeToAttendanceCount(selectedEventId, setCount);
    const unsubscribeLog = subscribeToCheckInLog(selectedEventId, setCheckInLog);

    return () => {
      unsubscribeCount();
      unsubscribeLog();
    };
  }, [selectedEventId]);

  // Effect to fetch candidate details only for new check-ins
  useEffect(() => {
    const newCandidateIds = checkInLog
      .map((record) => record.candidateId)
      .filter((id) => !candidates[id]);

    if (newCandidateIds.length > 0) {
      const fetchNewCandidates = async () => {
        const newCandidates: { [key: string]: Partial<Candidate> } = {};
        const promises = newCandidateIds.map(async (id) => {
          const candidate = await getCandidateById(id);
          if (candidate) {
            newCandidates[id] = candidate;
          }
        });
        await Promise.all(promises);
        setCandidates((prev) => ({ ...prev, ...newCandidates }));
      };
      fetchNewCandidates();
    }
  }, [checkInLog, candidates]);

  const handleExport = async () => {
    if (checkInLog.length === 0) {
      Alert.alert('No Data', 'No check-in records to export');
      return;
    }

    setExporting(true);
    try {
      // Build CSV content
      let csvContent = 'Name,Email,Scanned At,Scanned By\n';

      for (const record of checkInLog) {
        const candidateInfo = candidates[record.candidateId];
        if (candidateInfo) {
          const name = (candidateInfo.name || 'N/A').replace(/"/g, '""');
          const email = (candidateInfo.email || 'N/A').replace(/"/g, '""');
          const scannedAt = record.scannedAt.toDate().toISOString();
          csvContent += `"${name}","${email}","${scannedAt}","${record.scannedBy}"\n`;
        }
      }

      // Save to file
      const fileName = `checkin_${selectedEventId}_${new Date().getTime()}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // eslint-disable-next-line import/namespace
      const fileDirectory = FileSystem.documentDirectory;
      if (!fileDirectory) {
        Alert.alert('Error', 'Unable to access file system');
        return;
      }
      const filePath = fileDirectory + fileName;

      await FileSystem.writeAsStringAsync(filePath, csvContent);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: `Check-in records for ${events.find((e) => e.id === selectedEventId)?.title}`,
        });
      } else {
        Alert.alert('Success', `CSV saved to: ${filePath}`);
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.length > 0 && (
        <View style={styles.eventSelector}>
          <Text style={styles.selectorLabel}>Select Event:</Text>
          <FlatList
            data={events}
            horizontal
            scrollEnabled
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.eventTab,
                  selectedEventId === item.id && styles.eventTabActive,
                ]}
                onPress={() => setSelectedEventId(item.id)}
              >
                <Text
                  style={[
                    styles.eventTabText,
                    selectedEventId === item.id && styles.eventTabTextActive,
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.statsBox}>
        <View style={styles.statItem}>
          <Text style={styles.statsLabel}>Total Check-ins</Text>
          <Text style={styles.statsNumber}>{count}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statsLabel}>Log Entries</Text>
          <Text style={styles.statsNumber}>{checkInLog.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Check-in Log</Text>
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Ionicons
              name="download"
              size={16}
              color={exporting ? '#999' : '#fff'}
            />
            <Text style={styles.exportButtonText}>
              {exporting ? 'Exporting...' : 'Export'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={checkInLog}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.logItem}>
              <View style={styles.logContent}>
                <Text style={styles.logName}>
                  {candidates[item.candidateId]?.name || 'Loading...'}
                </Text>
                <Text style={styles.logTime}>
                  {item.scannedAt?.toDate ? item.scannedAt.toDate().toLocaleTimeString() : 'Just now'}
                </Text>
              </View>
              <View style={styles.logAction}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No check-ins yet</Text>
          }
          style={styles.logContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  eventSelector: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  eventTab: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  eventTabActive: {
    backgroundColor: '#007AFF',
  },
  eventTabText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  eventTabTextActive: {
    color: '#fff',
  },
  statsBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statsLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  statsNumber: {
    color: '#007AFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  section: {
    flex: 1,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    gap: 4,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logContent: {
    flex: 1,
  },
  logName: {
    fontSize: 14,
    fontWeight: '500',
  },
  logTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  logAction: {
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
});
