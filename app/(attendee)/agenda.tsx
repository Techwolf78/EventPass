import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { getEvents, EventData } from '@/utils/firestore';

export default function AgendaScreen() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const eventsList = await getEvents();
    setEvents(eventsList);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const eventsSections = events.map((event) => ({
    title: event.title,
    data: event.agenda || [],
    date: event.date,
  }));

  return (
    <View style={styles.container}>
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events found</Text>
        </View>
      ) : (
        <SectionList
          sections={eventsSections}
          keyExtractor={(item, index) => item.title + index}
          renderItem={({ item, section }) => (
            <View style={styles.agendaItem}>
              <View style={styles.timeContainer}>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <View style={styles.contentContainer}>
                <Text style={styles.sessionTitle}>{item.title}</Text>
                <Text style={styles.speaker}>{item.speaker}</Text>
                <Text style={styles.tag}>{item.tag}</Text>
              </View>
            </View>
          )}
          renderSectionHeader={({ section: { title, date } }) => (
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{title}</Text>
              <Text style={styles.eventDate}>
                {date.toDate().toLocaleDateString()}
              </Text>
            </View>
          )}
          renderSectionFooter={() => <View style={styles.sectionDivider} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  eventHeader: {
    backgroundColor: '#007AFF',
    padding: 16,
    marginTop: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  eventDate: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  agendaItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  timeContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 60,
  },
  contentContainer: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  speaker: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  tag: {
    fontSize: 10,
    backgroundColor: '#E8E8E8',
    color: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sectionDivider: {
    height: 8,
    backgroundColor: 'transparent',
  },
});
