import React, { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getEnrollmentDisplayName } from "@/hooks/use-attendee-theme";
import { getAllAgendas, saveAgenda } from "@/utils/firestore";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AGENDA_TYPES = ["masterclass", "event"] as const;
type AgendaType = (typeof AGENDA_TYPES)[number];

const TAG_OPTIONS = [
  "Keynote",
  "Workshop",
  "Networking",
  "Technical",
  "General",
] as const;

const MASTERCLASS_TITLES = [
  "Opening Keynote",
  "Technical Deep Dive",
  "Hands-on Workshop",
  "Expert Panel Discussion",
  "Q&A Session",
  "Networking Break",
  "Case Study Presentation",
  "Closing Remarks",
];

const EVENT_TITLES = [
  "Welcome Address",
  "Guest Speaker Session",
  "Panel Discussion",
  "Networking Break",
  "Workshop Session",
  "Fireside Chat",
  "Demo Session",
  "Closing Ceremony",
];

interface AgendaItemForm {
  time: string;
  title: string;
  speaker: string;
  tag: string;
  hour?: number;
  minute?: number;
  meridiem?: "AM" | "PM";
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const canEdit = role === "superadmin";

  const [activeType, setActiveType] = useState<AgendaType>("masterclass");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [items, setItems] = useState<AgendaItemForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null,
  );
  const [tempTime, setTempTime] = useState(new Date());

  const loadAgenda = useCallback(async (type: AgendaType) => {
    setLoading(true);
    try {
      const agendas = await getAllAgendas();
      const found = agendas.find((a) => (a as any).type === type);
      if (found) {
        setEventTitle(found.title || "");
        setEventDate(
          found.date?.toDate
            ? found.date.toDate().toISOString().split("T")[0]
            : "",
        );
        setItems(found.agenda || []);
      } else {
        setEventTitle("");
        setEventDate("");
        setItems([]);
      }
    } catch (error) {
      console.error("Error loading agenda:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgenda(activeType);
  }, [activeType, loadAgenda]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgenda(activeType);
    setRefreshing(false);
  }, [activeType, loadAgenda]);

  // Helper function to format time display
  const formatTimeDisplay = (
    hour?: number,
    minute?: number,
    meridiem?: string,
  ) => {
    if (hour === undefined || minute === undefined || !meridiem) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${meridiem}`;
  };

  // Handle DateTimePicker time change
  const handleTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android" || event.type === "set") {
      setShowTimePicker(false);
    }

    if (selectedDate && selectedItemIndex !== null) {
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const meridiem = hours >= 12 ? "PM" : "AM";
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

      handleUpdateItem(selectedItemIndex, "hour", displayHour);
      handleUpdateItem(selectedItemIndex, "minute", minutes);
      handleUpdateItem(selectedItemIndex, "meridiem", meridiem);
    }
  };

  // Open time picker for an item
  const openTimePicker = (index: number, item: AgendaItemForm) => {
    const hour = item.hour || 9;
    const minute = item.minute || 0;
    const meridiem = item.meridiem || "AM";

    // Convert to 24-hour format for the picker
    let hours24 = hour;
    if (meridiem === "PM" && hour !== 12) {
      hours24 = hour + 12;
    } else if (meridiem === "AM" && hour === 12) {
      hours24 = 0;
    }

    const newDate = new Date();
    newDate.setHours(hours24, minute, 0);
    setTempTime(newDate);
    setSelectedItemIndex(index);
    setShowTimePicker(true);
  };

  // Helper function to parse time string to components
  const parseTimeString = (timeStr: string) => {
    if (!timeStr) return { hour: 9, minute: 0, meridiem: "AM" };
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      return {
        hour: parseInt(match[1]),
        minute: parseInt(match[2]),
        meridiem: match[3].toUpperCase(),
      };
    }
    return { hour: 9, minute: 0, meridiem: "AM" };
  };

  const handleAddItem = () => {
    setItems((prev) => {
      const nextIndex = prev.length;
      const defaultTitles =
        activeType === "masterclass" ? MASTERCLASS_TITLES : EVENT_TITLES;
      const defaultTitle = defaultTitles[nextIndex % defaultTitles.length];
      return [
        ...prev,
        {
          time: "09:00 AM",
          title: defaultTitle,
          speaker: "",
          tag: "General",
          hour: 9,
          minute: 0,
          meridiem: "AM",
        },
      ];
    });
  };

  const handleRemoveItem = (index: number) => {
    const doDelete = async () => {
      // Remove from local state immediately
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);

      // Auto-save to Firestore if we have valid event details
      if (!eventTitle.trim() || !eventDate.trim()) {
        Alert.alert(
          "Removed Locally",
          "Please fill in the event title and date, then tap Save to persist this change to the database.",
        );
        return;
      }

      const parsedDate = new Date(eventDate.trim());
      if (isNaN(parsedDate.getTime())) {
        Alert.alert(
          "Removed Locally",
          "Please fix the event date, then tap Save to persist this change to the database.",
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
            hour: item.hour || 9,
            minute: item.minute || 0,
            meridiem: item.meridiem || "AM",
          })),
        );
        if (!result.success) {
          Alert.alert(
            "Delete Error",
            "Item removed locally but failed to save to database. Please try saving manually.",
          );
        }
      } catch (error: any) {
        Alert.alert(
          "Delete Error",
          error.message ||
            "Item removed locally but failed to save to database.",
        );
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete this agenda item?")) {
        doDelete();
      }
    } else {
      Alert.alert("Remove Item", "Delete this agenda item?", [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: doDelete,
        },
      ]);
    }
  };

  const handleUpdateItem = (
    index: number,
    field: keyof AgendaItemForm,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          // Auto-update time string when hour, minute, or meridiem changes
          if (field === "hour" || field === "minute" || field === "meridiem") {
            const hour = field === "hour" ? (value as number) : item.hour || 9;
            const minute =
              field === "minute" ? (value as number) : item.minute || 0;
            const meridiem =
              field === "meridiem" ? (value as string) : item.meridiem || "AM";
            updated.time = formatTimeDisplay(hour, minute, meridiem);
            updated.hour = hour;
            updated.minute = minute;
            updated.meridiem = meridiem as "AM" | "PM";
          } else if (field === "time") {
            const parsed = parseTimeString(value as string);
            updated.hour = parsed.hour;
            updated.minute = parsed.minute;
            updated.meridiem = parsed.meridiem as "AM" | "PM";
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleSortItems = () => {
    setItems((prev) => {
      return [...prev].sort((a, b) => {
        const getMinutes = (item: AgendaItemForm) => {
          let h = item.hour || 12;
          const m = item.minute || 0;
          const mer = item.meridiem || "AM";
          if (mer === "PM" && h !== 12) h += 12;
          if (mer === "AM" && h === 12) h = 0;
          return h * 60 + m;
        };
        return getMinutes(a) - getMinutes(b);
      });
    });
  };

  const handleSave = async () => {
    // Validate
    const showAlert = (title: string, message: string) => {
      if (Platform.OS === "web") {
        window.alert(`${title}: ${message}`);
      } else {
        Alert.alert(title, message);
      }
    };

    if (!eventTitle.trim()) {
      showAlert("Missing Title", "Please enter an event title.");
      return;
    }
    if (!eventDate.trim()) {
      showAlert("Missing Date", "Please enter an event date (YYYY-MM-DD).");
      return;
    }
    const parsedDate = new Date(eventDate.trim());
    if (isNaN(parsedDate.getTime())) {
      showAlert(
        "Invalid Date",
        "Please enter a valid date in YYYY-MM-DD format.",
      );
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.time.trim() || !item.title.trim()) {
        showAlert(
          "Incomplete Item",
          `Agenda item #${i + 1} is missing a time or title. Please fill all required fields.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      console.log("Attempting to save agenda to Firebase...");
      const result = await saveAgenda(
        activeType,
        eventTitle.trim(),
        parsedDate,
        items.map((item) => ({
          time: item.time.trim(),
          title: item.title.trim(),
          speaker: item.speaker.trim(),
          tag: item.tag,
          hour: item.hour || 9,
          minute: item.minute || 0,
          meridiem: item.meridiem || "AM",
        })),
      );
      console.log("Save result:", result);

      if (Platform.OS === "web") {
        window.alert(
          result.success
            ? "Saved: " + result.message
            : "Error: " + result.message,
        );
      } else {
        Alert.alert(result.success ? "Saved" : "Error", result.message);
      }

      if (result.success) {
        loadAgenda(activeType);
      }
    } catch (error: any) {
      console.error("Save agenda error exception:", error);
      if (Platform.OS === "web") {
        window.alert("Error: " + (error.message || "Failed to save agenda"));
      } else {
        Alert.alert("Error", error.message || "Failed to save agenda");
      }
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = getEnrollmentDisplayName(activeType);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Agenda Builder</Text>
            <Text style={styles.headerSubtitle}>ADMIN • EVENTPASS ({role})</Text>
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
                  name={type === "masterclass" ? "school" : "people"}
                  size={18}
                  color={activeType === type ? "#fff" : "#000000"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    activeType === type && styles.toggleBtnTextActive,
                  ]}
                >
                  {getEnrollmentDisplayName(type)}
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
              placeholder={`e.g. ${activeType === "masterclass" ? "Advanced React Native Workshop" : "Synergy Sphere 2026"}`}
              placeholderTextColor="#9ca3af"
              value={eventTitle}
              onChangeText={setEventTitle}
              editable={!saving && canEdit}
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
              editable={!saving && canEdit}
            />
          </View>
        </View>

        {/* Agenda Items */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>AGENDA ITEMS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {canEdit && items.length > 1 && (
                <TouchableOpacity
                  onPress={handleSortItems}
                  style={styles.sortBtn}
                  disabled={saving}
                >
                  <Ionicons name="swap-vertical" size={14} color="#000000" />
                  <Text style={styles.sortBtnText}>Sort by Time</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.itemCount}>{items.length} items</Text>
            </View>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.agendaItemCard}>
              <View style={styles.agendaItemHeader}>
                <View style={styles.itemNumberBadge}>
                  <Text style={styles.itemNumberText}>#{index + 1}</Text>
                </View>
                {canEdit && (
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, index === 0 && styles.actionBtnDisabled]}
                      onPress={() => handleMoveItem(index, "up")}
                      disabled={index === 0 || saving}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={14}
                        color={index === 0 ? "#D1D5DB" : "#000000"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, index === items.length - 1 && styles.actionBtnDisabled]}
                      onPress={() => handleMoveItem(index, "down")}
                      disabled={index === items.length - 1 || saving}
                    >
                      <Ionicons
                        name="arrow-down"
                        size={14}
                        color={index === items.length - 1 ? "#D1D5DB" : "#000000"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={() => handleRemoveItem(index)}
                      disabled={saving}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.itemRow}>
                {/* Time Picker Button */}
                <View style={[styles.itemField, { flex: 0.35 }]}>
                  <Text style={styles.fieldLabel}>Time *</Text>
                  <TouchableOpacity
                    style={[
                      styles.timePickerButton,
                      !canEdit && styles.timePickerButtonDisabled,
                    ]}
                    onPress={() => openTimePicker(index, item)}
                    disabled={saving || !canEdit}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={canEdit && !saving ? "#1F2937" : "#9CA3AF"}
                    />
                    <Text
                      style={[
                        styles.timePickerButtonText,
                        !canEdit && styles.timePickerButtonTextDisabled,
                      ]}
                    >
                      {formatTimeDisplay(item.hour, item.minute, item.meridiem)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <View style={[styles.itemField, { flex: 0.65 }]}>
                  <Text style={styles.fieldLabel}>Title *</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="Session title"
                    placeholderTextColor="#9ca3af"
                    value={item.title}
                    onChangeText={(v) => handleUpdateItem(index, "title", v)}
                    editable={!saving && canEdit}
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
                    onChangeText={(v) => handleUpdateItem(index, "speaker", v)}
                    editable={!saving && canEdit}
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
                      onPress={() =>
                        canEdit && handleUpdateItem(index, "tag", tag)
                      }
                      disabled={saving || !canEdit}
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
          {canEdit && (
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={handleAddItem}
              disabled={saving}
            >
              <Ionicons name="add-circle" size={20} color="#000000" />
              <Text style={styles.addItemBtnText}>Add Agenda Item</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Button */}
        {canEdit && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveButtonText}>
                  Save {typeLabel} Agenda
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      {/* DateTimePicker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimePickerChange}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Section Card
  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#000000",
  },
  // Toggle
  toggleRow: {
    flexDirection: "column",
    gap: 8,
  },
  toggleBtn: {
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    width: "100%",
  },
  toggleBtnActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000000",
    fontWeight: "500",
  },
  inputSmall: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#000000",
    fontWeight: "500",
  },
  // Agenda Items
  agendaItemCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  agendaItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  deleteItemBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#000000",
  },
  itemNumberBadge: {
    backgroundColor: "#000000",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  itemRow: {
    flexDirection: "row",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tagChipActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4B5563",
  },
  tagChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Add Item Button
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    marginTop: 4,
    backgroundColor: "#FFFFFF",
  },
  addItemBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
  // Save Button
  saveButton: {
    backgroundColor: "#000000",
    marginHorizontal: 20,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Time Picker Styles
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8, // Changed from 10 to 8 to match inputSmall
  },
  timePickerButtonDisabled: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  timePickerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  timePickerButtonTextDisabled: {
    color: "#9CA3AF",
  },
  timePickerScroll: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  timeOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 2,
  },
  timeOptionActive: {
    backgroundColor: "#000000",
  },
  timeOptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
    textAlign: "center",
  },
  timeOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  meridlemRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  meridiemOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  meridiemOptionActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  meridiemText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#4B5563",
  },
  meridiemTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
