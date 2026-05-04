import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
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

    setCount(0);
    setCheckInLog([]);

    const unsubscribeCount = subscribeToAttendanceCount(selectedEventId, setCount);
    const unsubscribeLog = subscribeToCheckInLog(selectedEventId, setCheckInLog);

    return () => {
      unsubscribeCount();
      unsubscribeLog();
    };
  }, [selectedEventId]);

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

  const attendanceRate = useMemo(() => {
    const total = Math.max(checkInLog.length, count);
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }, [count, checkInLog.length]);

  const handleExport = async () => {
    if (checkInLog.length === 0) {
      Alert.alert('No Data', 'No check-in records to export');
      return;
    }

    setExporting(true);
    try {
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

      const fileDirectory = FileSystem.documentDirectory;
      if (!fileDirectory) {
        Alert.alert('Error', 'Unable to access file system');
        return;
      }
      const filePath = fileDirectory + fileName;

      await FileSystem.writeAsStringAsync(filePath, csvContent);

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
        stickyHeaderIndices={[1]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>ADMIN • LIVE DASHBOARD</Text>
          </View>
          <TouchableOpacity
            style={styles.exportIconBtn}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Ionicons name="download" size={22} color="#8B5CF6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Event Selector */}
        {events.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.eventSelectorRow}
            contentContainerStyle={styles.eventSelectorContent}
          >
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventTab,
                  selectedEventId === event.id && styles.eventTabActive,
                ]}
                onPress={() => setSelectedEventId(event.id)}
              >
                <Text style={[
                  styles.eventTabText,
                  selectedEventId === event.id && styles.eventTabTextActive,
                ]} numberOfLines={1}>
                  {event.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberPurple]}>
              {checkInLog.length}
            </Text>
            <Text style={styles.statLabel}>Registered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberGreen]}>
              {count}
            </Text>
            <Text style={styles.statLabel}>Checked in</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberOrange]}>
              {Math.max(0, checkInLog.length - count)}
            </Text>
            <Text style={styles.statLabel}>Not yet</Text>
          </View>
        </View>

        {/* Attendance Progress Bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Attendance rate</Text>
            <Text style={styles.progressPercent}>{attendanceRate}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(attendanceRate, 100)}%` }]}
            />
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LIVE CHECK-IN LOG</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* Check-in Log */}
        <View style={styles.logCard}>
          {checkInLog.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="scan" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No check-ins yet</Text>
              <Text style={styles.emptySubtext}>
                Scan QR codes to see check-ins here
              </Text>
            </View>
          ) : (
            checkInLog.slice(0, 15).map((item, idx) => {
              const candidateInfo = candidates[item.candidateId];
              const name = candidateInfo?.name || 'Loading...';
              const role = candidateInfo?.role || 'Attendee';
              const time = item.scannedAt?.toDate
                ? item.scannedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now';
              const isCheckedIn = true;

              return (
                <View key={item.id} style={styles.logItem}>
                  <View style={[styles.logAvatar, { backgroundColor: getAvatarColor(name) }]}>
                    <Text style={styles.logAvatarText}>{getInitials(name)}</Text>
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.logRole}>{role}</Text>
                  </View>
                  <View style={styles.logRight}>
                    <Text style={styles.logTime}>{time}</Text>
                    <View style={[
                      styles.logStatus,
                      isCheckedIn ? styles.logStatusIn : styles.logStatusPending,
                    ]}>
                      <Ionicons
                        name={isCheckedIn ? 'checkmark' : 'time'}
                        size={12}
                        color={isCheckedIn ? '#10B981' : '#F59E0B'}
                      />
                      <Text style={[
                        styles.logStatusText,
                        { color: isCheckedIn ? '#10B981' : '#F59E0B' },
                      ]}>
                        {isCheckedIn ? 'In' : 'Not yet'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download" size={18} color="#fff" />
              <Text style={styles.exportBtnText}>Export attendance CSV</Text>
            </>
          )}
        </TouchableOpacity>

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
  exportIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Event Selector
  eventSelectorRow: {
    maxHeight: 44,
    marginBottom: 16,
  },
  eventSelectorContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  eventTab: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  eventTabActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  eventTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  eventTabTextActive: {
    color: '#fff',
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
  },
  statNumberPurple: {
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
  // Progress
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  // Log
  logCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  logInfo: {
    flex: 1,
    minWidth: 0,
  },
  logName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  logRole: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  logRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  logTime: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 4,
  },
  logStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  logStatusIn: {
    backgroundColor: '#D1FAE5',
  },
  logStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  logStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#d1d5db',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  // Export Button
  exportBtn: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
