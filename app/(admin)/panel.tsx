import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeToCheckInLog,
  AttendanceRecord,
  Candidate,
  getCandidateById,
  getMasterclassAgenda,
  getEventAgenda,
  EventData,
  subscribeToCandidateCount,
} from '@/utils/firestore';
import { formatTimeAgo } from '@/utils/time';
import { getEnrollmentDisplayName } from '@/hooks/use-attendee-theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const AVATAR_COLORS = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#FF5722'];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

type EnrollmentType = 'masterclass' | 'event';

interface AgendaWithType extends Omit<EventData, 'date' | 'agenda'> {
  type: EnrollmentType;
  date: EventData['date'] | null;
}

export default function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
  const [agendas, setAgendas] = useState<AgendaWithType[]>([]);
  const [selectedType, setSelectedType] = useState<EnrollmentType>('masterclass');
  const [checkInLog, setCheckInLog] = useState<AttendanceRecord[]>([]);
  const [candidates, setCandidates] = useState<{
    [key: string]: Partial<Candidate>;
  }>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const currentAgenda = agendas.find((a) => a.type === selectedType);

  const loadAgendas = useCallback(async () => {
    setLoading(true);
    try {
      const [masterclassAgenda, eventAgenda] = await Promise.all([
        getMasterclassAgenda(),
        getEventAgenda(),
      ]);

      const agendasList: AgendaWithType[] = [
        {
          id: masterclassAgenda?.id || 'default-masterclass',
          title: masterclassAgenda?.title || "Gryphon Academy's Masterclass 3.0",
          date: masterclassAgenda?.date || null,
          type: 'masterclass',
        },
        {
          id: eventAgenda?.id || 'default-event',
          title: eventAgenda?.title || "Gryphon Academy's Synergy Sphere",
          date: eventAgenda?.date || null,
          type: 'event',
        }
      ];
      
      setAgendas(agendasList);
      
      // Auto-select based on availability or default to first
      if (!selectedType) {
        setSelectedType('masterclass');
      }
    } catch (error) {
      console.error('Error loading agendas:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadAgendas();
  }, [loadAgendas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgendas();
    setRefreshing(false);
  }, [loadAgendas]);

  useEffect(() => {
    if (!selectedType) return;

    // Subscribe to candidate count for the selected type (Masterclass vs Event)
    const unsubscribeCandidateCount = subscribeToCandidateCount(selectedType, setRegisteredCount);

    // Subscribe to ALL check-ins globally
    const unsubscribeLog = subscribeToCheckInLog(setCheckInLog);

    return () => {
      unsubscribeCandidateCount();
      unsubscribeLog();
    };
  }, [selectedType]);

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

  // Intelligent filter: Categorize check-ins by the candidate's actual enrollment type
  // AND ensure each candidate only appears once in the list (de-duplication)
  const filteredLog = useMemo(() => {
    const seen = new Set();
    return checkInLog.filter(record => {
      if (seen.has(record.candidateId)) return false;
      
      const candidateInfo = candidates[record.candidateId];
      if (!candidateInfo) return true; // Keep it while loading, will be filtered once data arrives
      
      const isMatch = candidateInfo.enrollmentType === selectedType;
      if (isMatch) {
        seen.add(record.candidateId);
        return true;
      }
      return false;
    });
  }, [checkInLog, candidates, selectedType]);

  // The actual count of UNIQUE checked-in candidates for this tab
  const checkedInCount = useMemo(() => filteredLog.length, [filteredLog]);

  const attendanceRate = useMemo(() => {
    if (registeredCount === 0) return 0;
    return Math.round((checkedInCount / registeredCount) * 100);
  }, [checkedInCount, registeredCount]);

  const handleExport = async () => {
    if (checkInLog.length === 0) {
      Alert.alert('No Data', 'No check-in records to export');
      return;
    }

    setExporting(true);
    try {
      let csvContent = 'Name,Email,Enrollment Type,Scanned At,Scanned By\n';

      for (const record of checkInLog) {
        const candidateInfo = candidates[record.candidateId];
        if (candidateInfo) {
          const name = (candidateInfo.name || 'N/A').replace(/"/g, '""');
          const email = (candidateInfo.email || 'N/A').replace(/"/g, '""');
          const type = (candidateInfo.enrollmentType || 'N/A').toUpperCase();
          const scannedAt = record.scannedAt.toDate().toISOString();
          csvContent += `"${name}","${email}","${type}","${scannedAt}","${record.scannedBy}"\n`;
        }
      }

      const fileName = `checkin_${selectedType}_${new Date().getTime()}.csv`;

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

      const fileDirectory = (FileSystem as any).documentDirectory;
      if (!fileDirectory) {
        Alert.alert('Error', 'Unable to access file system');
        return;
      }
      const filePath = fileDirectory + fileName;

      await FileSystem.writeAsStringAsync(filePath, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: `Check-in records for ${getEnrollmentDisplayName(selectedType).toUpperCase()}`,
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
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle}>ADMIN • LIVE DASHBOARD</Text>
          </View>
        </View>

        {/* Type Selector - Masterclass / Event */}
        <View
            style={styles.eventSelectorRow}
          >
            <View style={styles.eventSelectorContent}>
              {agendas.map((agenda) => (
              <TouchableOpacity
                key={agenda.type}
                style={[
                  styles.eventTab,
                  selectedType === agenda.type && styles.eventTabActive,
                ]}
                onPress={() => {
                  setSelectedType(agenda.type);
                }}
              >
                <Ionicons
                  name={agenda.type === 'masterclass' ? 'school' : 'people'}
                  size={14}
                  color={selectedType === agenda.type ? '#fff' : '#94a3b8'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[
                  styles.eventTabText,
                  selectedType === agenda.type && styles.eventTabTextActive,
                ]} numberOfLines={1}>
                  {getEnrollmentDisplayName(agenda.type)}
                </Text>
              </TouchableOpacity>
            ))}
            </View>
          </View>

        {/* Event Info Card */}
        {currentAgenda && (
          <View style={styles.eventInfoCard}>
            <View style={styles.eventInfoContent}>
              <View style={styles.eventIconContainer}>
                <Ionicons
                  name={selectedType === 'masterclass' ? 'school' : 'calendar'}
                  size={24}
                  color="#000000"
                />
              </View>
              <View style={styles.eventInfoText}>
                <Text style={styles.eventInfoTitle}>{currentAgenda.title}</Text>
                <Text style={styles.eventInfoDate}>
                  {currentAgenda.date?.toDate
                    ? currentAgenda.date.toDate().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                    : 'Date TBA'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberPurple]}>
              {registeredCount}
            </Text>
            <Text style={styles.statLabel}>Registered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberGreen]}>
              {checkedInCount}
            </Text>
            <Text style={styles.statLabel}>Checked in</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statNumberOrange]}>
              {Math.max(0, registeredCount - checkedInCount)}
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
            <View
              style={[styles.progressFill, { width: `${Math.min(attendanceRate, 100)}%` }]}
            />
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LIVE CHECK-IN LOG ({getEnrollmentDisplayName(selectedType).toUpperCase()})</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* Check-in Log */}
        <View style={styles.logCard}>
          {filteredLog.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="scan" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No {getEnrollmentDisplayName(selectedType).toLowerCase()} check-ins</Text>
              <Text style={styles.emptySubtext}>
                Candidates will appear here after scanning
              </Text>
            </View>
          ) : (
            filteredLog.slice(0, 15).map((item, idx) => {
              const candidateInfo = candidates[item.candidateId];
              const name = candidateInfo?.name || 'Loading...';
              const role = candidateInfo?.enrollmentType === 'masterclass' ? 'Masterclass Attendee' : 'Synergy Sphere Attendee';
              const time = formatTimeAgo(item.scannedAt);
              const isCheckedIn = true;

              return (
                <View key={item.id} style={styles.logItem}>
                  <View style={[styles.logAvatar, { backgroundColor: getAvatarColor(name) }]}>
                    <Text style={styles.logAvatarText}>{getInitials(name)}</Text>
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logName}>{name}</Text>
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
                        {isCheckedIn ? 'Checked In' : 'Pending'}
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

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 100,
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exportIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Event Selector
  eventSelectorRow: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  eventSelectorContent: {
    flexDirection: 'column',
    gap: 8,
  },
  eventTab: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  eventTabActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  eventTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  eventTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Event Info Card
  eventInfoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  eventInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfoText: {
    flex: 1,
  },
  eventInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  eventInfoDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  statNumberPurple: { color: '#000000' },
  statNumberGreen: { color: '#000000' },
  statNumberOrange: { color: '#000000' },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Progress
  progressCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 3,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
  },
  // Log
  logCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  logInfo: {
    flex: 1,
    minWidth: 0,
  },
  logName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  logRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '400',
  },
  logRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  logTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
    marginBottom: 4,
  },
  logStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logStatusIn: {
    backgroundColor: '#F9FAFB',
  },
  logStatusPending: {
    backgroundColor: '#FFFFFF',
  },
  logStatusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '400',
  },
  // Export Button
  exportBtn: {
    backgroundColor: '#000000',
    marginHorizontal: 20,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});