import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { getAllAgendas, saveAgenda, deleteAgenda, EventData } from '@/utils/firestore';

const AGENDA_TYPES = ['masterclass', 'event'] as const;
type AgendaType = (typeof AGENDA_TYPES)[number];

const TAG_OPTIONS = ['Keynote', 'Workshop', 'Networking', 'Technical', 'General'] as const;

const MASTERCLASS_TITLES = [
  'Opening Keynote',
  'Technical Deep Dive',
  'Hands-on Workshop',
  'Expert Panel Discussion',
  'Q&A Session',
  'Networking Break',
  'Case Study Presentation',
  'Closing Remarks',
];

const EVENT_TITLES = [
  'Welcome Address',
  'Guest Speaker Session',
  'Panel Discussion',
  'Networking Break',
  'Workshop Session',
  'Fireside Chat',
  'Demo Session',
  'Closing Ceremony',
];

interface AgendaItemForm {
  time: string;
  title: string;
  speaker: string;
  tag: string;
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const [activeType, setActiveType] = useState<AgendaType>('masterclass');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [items, setItems] = useState<AgendaItemForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    loadAgenda(activeType);
  }, [activeType]);

  const loadAgenda = async (type: AgendaType) => {
    setLoading(true);
    try {
      const agendas = await getAllAgendas();
      const found = agendas.find((a) => (a as any).type === type);
      if (found) {
        setExistingId(found.id);
        setEventTitle(found.title || '');
        setEventDate(
          found.date?.toDate
            ? found.date.toDate().toISOString().split('T')[0]
            : ''
        );
        setItems(found.agenda || []);
      } else {
        setExistingId(null);
        setEventTitle('');
        setEventDate('');
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => {
      const nextIndex = prev.length;
      const defaultTitles = activeType === 'masterclass' ? MASTERCLASS_TITLES : EVENT_TITLES;
      const defaultTitle = defaultTitles[nextIndex % defaultTitles.length];
      return [
        ...prev,
        { time: '', title: defaultTitle, speaker: '', tag: 'General' },
      ];
    });
  };

  const handleRemoveItem = (index: number) => {
    Alert.alert('Remove Item', 'Delete this agenda item?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Remove from local state immediately
          const updatedItems = items.filter((_, i) => i !== index);
          setItems(updatedItems);

          // Auto-save to Firestore if we have valid event details
          if (!eventTitle.trim() || !eventDate.trim()) {
            Alert.alert(
              'Removed Locally',
              'Please fill in the event title and date, then tap Save to persist this change to the database.'
            );
            return;
          }

          const parsedDate = new Date(eventDate.trim());
          if (isNaN(parsedDate.getTime())) {
            Alert.alert(
              'Removed Locally',
              'Please fix the event date, then tap Save to persist this change to the database.'
            );
            return;
          }

          setSaving(true);
          try {
            const result = await saveAgenda(
              activeType,
              eventTitle.trim(),
              parsedDate,
              updatedItems.map((item) => ({
                time: item.time.trim(),
                title: item.title.trim(),
                speaker: item.speaker.trim(),
                tag: item.tag,
              }))
            );
            if (!result.success) {
              Alert.alert('Delete Error', 'Item removed locally but failed to save to database. Please try saving manually.');
            }
          } catch (error: any) {
            Alert.alert('Delete Error', error.message || 'Item removed locally but failed to save to database.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof AgendaItemForm,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async () => {
    // Validate
    if (!eventTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title.');
      return;
    }
    if (!eventDate.trim()) {
      Alert.alert('Missing Date', 'Please enter an event date (YYYY-MM-DD).');
      return;
    }
    const parsedDate = new Date(eventDate.trim());
    if (isNaN(parsedDate.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.time.trim() || !item.title.trim()) {
        Alert.alert(
          'Incomplete Item',
          `Agenda item #${i + 1} is missing a time or title. Please fill all required fields.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const result = await saveAgenda(
        activeType,
        eventTitle.trim(),
        parsedDate,
        items.map((item) => ({
          time: item.time.trim(),
          title: item.title.trim(),
          speaker: item.speaker.trim(),
          tag: item.tag,
        }))
      );
      Alert.alert(result.success ? 'Saved' : 'Error', result.message);
      if (result.success) {
        loadAgenda(activeType);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save agenda');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = activeType.charAt(0).toUpperCase() + activeType.slice(1);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Agenda Builder</Text>
            <Text style={styles.headerSubtitle}>ADMIN • INNOVATESUMMIT</Text>
          </View>
        </View>

        {/* Type Toggle */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>AGENDA TYPE</Text>
          <View style={styles.toggleRow}>
            {AGENDA_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.toggleBtn,
                  activeType === type && styles.toggleBtnActive,
                ]}
                onPress={() => setActiveType(type)}
              >
                <Ionicons
                  name={type === 'masterclass' ? 'school' : 'people'}
                  size={18}
                  color={activeType === type ? '#fff' : '#8B5CF6'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    activeType === type && styles.toggleBtnTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>EVENT DETAILS</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder={`e.g. ${activeType === 'masterclass' ? 'Advanced React Native Workshop' : 'InnovateSummit 2025'}`}
              placeholderTextColor="#9ca3af"
              value={eventTitle}
              onChangeText={setEventTitle}
              editable={!saving}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2025-05-15"
              placeholderTextColor="#9ca3af"
              value={eventDate}
              onChangeText={setEventDate}
              keyboardType="numbers-and-punctuation"
              editable={!saving}
            />
          </View>
        </View>

        {/* Agenda Items */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>AGENDA ITEMS</Text>
            <Text style={styles.itemCount}>{items.length} items</Text>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.agendaItemCard}>
              <View style={styles.agendaItemHeader}>
                <View style={styles.itemNumberBadge}>
                  <Text style={styles.itemNumberText}>#{index + 1}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => handleRemoveItem(index)}
                  disabled={saving}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemRow}>
                <View style={[styles.itemField, { flex: 0.35 }]}>
                  <Text style={styles.fieldLabel}>Time *</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="09:00 AM"
                    placeholderTextColor="#9ca3af"
                    value={item.time}
                    onChangeText={(v) => handleUpdateItem(index, 'time', v)}
                    editable={!saving}
                  />
                </View>
                <View style={[styles.itemField, { flex: 0.65 }]}>
                  <Text style={styles.fieldLabel}>Title *</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="Session title"
                    placeholderTextColor="#9ca3af"
                    value={item.title}
                    onChangeText={(v) => handleUpdateItem(index, 'title', v)}
                    editable={!saving}
                  />
                </View>
              </View>

              <View style={styles.itemRow}>
                <View style={[styles.itemField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Speaker</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="Speaker name"
                    placeholderTextColor="#9ca3af"
                    value={item.speaker}
                    onChangeText={(v) => handleUpdateItem(index, 'speaker', v)}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Tag Selector */}
              <View style={styles.tagSelectorRow}>
                <Text style={styles.fieldLabel}>Tag</Text>
                <View style={styles.tagsWrap}>
                  {TAG_OPTIONS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagChip,
                        item.tag === tag && styles.tagChipActive,
                      ]}
                      onPress={() => handleUpdateItem(index, 'tag', tag)}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          item.tag === tag && styles.tagChipTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}

          {/* Add Item Button */}
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={handleAddItem}
            disabled={saving}
          >
            <Ionicons name="add-circle" size={20} color="#8B5CF6" />
            <Text style={styles.addItemBtnText}>Add Agenda Item</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                Save {typeLabel} Agenda
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Entire Agenda */}
        {existingId && (
          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={styles.deleteAgendaBtn}
              onPress={() => {
                Alert.alert(
                  'Delete Entire Agenda',
                  `Are you sure you want to delete the entire ${typeLabel.toLowerCase()} agenda? This cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        setSaving(true);
                        try {
                          const result = await deleteAgenda(activeType);
                          Alert.alert(result.success ? 'Deleted' : 'Error', result.message);
                          if (result.success) {
                            loadAgenda(activeType);
                          }
                        } catch (error: any) {
                          Alert.alert('Error', error.message || 'Failed to delete agenda');
                        } finally {
                          setSaving(false);
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={saving}
            >
              <Ionicons name="trash-bin" size={18} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.deleteAgendaBtnText}>Delete This {typeLabel} Agenda</Text>
            </TouchableOpacity>
          </View>
        )}

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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  // Section Card
  sectionCard: {
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  toggleBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  inputSmall: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
  // Agenda Items
  agendaItemCard: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  agendaItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteItemBtn: {
    padding: 8,
  },
  itemNumberBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  itemNumberText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  itemField: {
    minWidth: 0,
  },
  // Tags
  tagSelectorRow: {
    marginTop: 2,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8B5CF6',
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  tagChipTextActive: {
    color: '#8B5CF6',
  },
  // Add Item Button
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c4b5fd',
    marginTop: 4,
  },
  addItemBtnText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  // Save Button
  saveButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Delete Section
  deleteSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  deleteAgendaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteAgendaBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
