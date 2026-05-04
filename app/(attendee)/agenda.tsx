import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  getMasterclassAgenda,
  getEventAgenda,
  EventData,
  getCandidateByQRToken,
} from '@/utils/firestore';

export default function AgendaScreen() {
  const { qrToken } = useLocalSearchParams();
  const [agenda, setAgenda] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgenda();
  }, [qrToken]);

  const loadAgenda = async () => {
    setLoading(true);
    try {
      // Step 1: Get enrollment type from QR token
      if (qrToken) {
        const candidate = await getCandidateByQRToken(qrToken as string);
        if (candidate) {
          // Step 2: Fetch appropriate agenda based on enrollment type
          if (candidate.enrollmentType === 'masterclass') {
            const masterclassAgenda = await getMasterclassAgenda();
            setAgenda(masterclassAgenda);
          } else {
            const eventAgenda = await getEventAgenda();
            setAgenda(eventAgenda);
          }
        }
      }
    } catch (error) {
      console.error('Error loading agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading agenda...</Text>
      </View>
    );
  }

  const eventsSections = agenda
    ? [
        {
          title: agenda.title,
          data: agenda.agenda || [],
          date: agenda.date,
        },
      ]
    : [];

  return (
    <LinearGradient colors={['#f9fafb', '#f3f4f6']} style={styles.container}>
      {!agenda || eventsSections[0]?.data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No agenda scheduled</Text>
          <Text style={styles.emptySubtext}>
            Check back later for upcoming events
          </Text>
        </View>
      ) : (
        <SectionList
          sections={eventsSections}
          keyExtractor={(item, index) => item.title + index}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, section }) => (
            <View style={styles.agendaCard}>
              <View style={styles.timeSection}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time" size={16} color="#667eea" />
                  <Text style={styles.time}>{item.time}</Text>
                </View>
              </View>
              <View style={styles.contentSection}>
                <Text style={styles.sessionTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.speakerRow}>
                  <Ionicons name="person-circle" size={14} color="#9ca3af" />
                  <Text style={styles.speaker}>{item.speaker}</Text>
                </View>
                <View style={styles.tagContainer}>
                  <View style={[styles.tag, getTagStyle(item.tag)]}>
                    <Text style={styles.tagText}>{item.tag}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.rightArrow}>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </View>
            </View>
          )}
          renderSectionHeader={({ section: { title, date } }) => (
            <View>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.eventHeader}
              >
                <View style={styles.eventHeaderContent}>
                  <View>
                    <Text style={styles.eventTitle}>{title}</Text>
                    <View style={styles.eventDateRow}>
                      <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.eventDate}>
                        {date?.toDate ? date.toDate().toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        }) : 'Date TBA'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eventBadge}>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}
          renderSectionFooter={() => <View style={styles.sectionDivider} />}
        />
      )}
    </LinearGradient>
  );
}

const getTagStyle = (tag: string | undefined) => {
  if (!tag) return styles.tagDefault;
  
  const tagStyles: { [key: string]: any } = {
    general: styles.tagGeneral,
    workshop: styles.tagWorkshop,
    technical: styles.tagTechnical,
    networking: styles.tagNetworking,
  };
  return tagStyles[tag.toLowerCase()] || styles.tagDefault;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  eventHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  eventHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  eventDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  eventBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agendaCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  timeSection: {
    marginRight: 12,
    justifyContent: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
  },
  contentSection: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  speaker: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  tagContainer: {
    marginTop: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagGeneral: {
    backgroundColor: '#dbeafe',
  },
  tagWorkshop: {
    backgroundColor: '#fce7f3',
  },
  tagTechnical: {
    backgroundColor: '#e0e7ff',
  },
  tagNetworking: {
    backgroundColor: '#d1fae5',
  },
  tagDefault: {
    backgroundColor: '#f3f4f6',
  },
  rightArrow: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  sectionDivider: {
    height: 12,
    backgroundColor: 'transparent',
  },
});
