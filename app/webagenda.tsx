import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getMasterclassAgenda,
  getEventAgenda,
  saveAgenda,
} from "@/utils/firestore";

// Define TypeScript interfaces for our agenda types
interface AgendaItem {
  id: string; // client-only unique identifier
  time: string;
  title: string;
  speaker: string;
  tag: string;
  itemType: "session" | "poll";
  pollUrl?: string;
}

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

const DEFAULT_TEMPLATE: AgendaItem[] = [
  {
    id: "temp-1",
    time: "09:00 AM",
    title: "Opening Keynote & Welcome",
    speaker: "Dr. Aris Vance",
    tag: "Keynote",
    itemType: "session",
    pollUrl: ""
  },
  {
    id: "temp-2",
    time: "10:15 AM",
    title: "Architecting the Future of Web Apps",
    speaker: "Elena Rostova",
    tag: "Technical",
    itemType: "session",
    pollUrl: ""
  },
  {
    id: "temp-3",
    time: "11:30 AM",
    title: "Interactive Live Q&A & Feedback Session",
    speaker: "",
    tag: "General",
    itemType: "poll",
    pollUrl: "https://eventpass.live/qa-poll"
  },
  {
    id: "temp-4",
    time: "12:30 PM",
    title: "Networking Lunch & Exhibition Showcase",
    speaker: "All attendees",
    tag: "General",
    itemType: "session",
    pollUrl: ""
  }
];

export default function WebAgendaDashboard() {
  const [agendaType, setAgendaType] = useState<"masterclass" | "event">("masterclass");
  const [jsonInput, setJsonInput] = useState("");
  const [eventTitle, setEventTitle] = useState("Tech Summit 2026");
  const [eventDate, setEventDate] = useState("Monday, May 12, 2026");
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(DEFAULT_TEMPLATE);
  
  // Status and loader states
  const [fetchingLive, setFetchingLive] = useState(false);
  const [savingLive, setSavingLive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Load live agenda from Firestore
  const fetchLiveAgenda = useCallback(async (type: "masterclass" | "event") => {
    setFetchingLive(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const agendaDoc = type === "masterclass" 
        ? await getMasterclassAgenda() 
        : await getEventAgenda();
      
      if (agendaDoc) {
        setEventTitle(agendaDoc.title || "");
        
        // Format Timestamp date
        if (agendaDoc.date) {
          const jsDate = (agendaDoc.date as any).toDate ? (agendaDoc.date as any).toDate() : new Date(agendaDoc.date as any);
          setEventDate(jsDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        } else {
          setEventDate("");
        }

        // Map agenda items
        if (agendaDoc.agenda && Array.isArray(agendaDoc.agenda)) {
          const mapped = agendaDoc.agenda.map((item: any, idx: number) => ({
            id: `agenda-db-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            time: item.time || "",
            title: item.title || "",
            speaker: item.speaker || "",
            tag: item.tag || "General",
            itemType: (item.itemType === "poll" || item.pollUrl) ? "poll" as const : "session" as const,
            pollUrl: item.pollUrl || "",
          }));
          setAgendaItems(mapped);
          setSuccessMsg(`Loaded live ${type === "masterclass" ? "Masterclass" : "Synergy Sphere"} agenda from Firestore.`);
          triggerFeedback("success", "Loaded live agenda!");
        } else {
          setAgendaItems([]);
          setSuccessMsg(`Live agenda document found but it contains no sessions.`);
        }
      } else {
        setSuccessMsg(`No live agenda found in Firestore for ${type === "masterclass" ? "Masterclass" : "Synergy Sphere"}. Using default template.`);
        setAgendaItems(DEFAULT_TEMPLATE);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to load live agenda: ${err.message}`);
      triggerFeedback("error", "Error loading from Firestore");
    } finally {
      setFetchingLive(false);
    }
  }, []);

  // Fetch live agenda when component mounts or agendaType changes
  useEffect(() => {
    fetchLiveAgenda(agendaType);
  }, [agendaType, fetchLiveAgenda]);

  // Load clean template to input on mount
  useEffect(() => {
    const cleanTemplate = DEFAULT_TEMPLATE.map(({ id, ...rest }) => {
      const timeParts = parseTimeString(rest.time);
      return {
        hour: timeParts.hour,
        minute: timeParts.minute,
        meridiem: timeParts.meridiem,
        itemType: rest.itemType,
        pollUrl: rest.pollUrl || "",
        speaker: rest.speaker || "",
        tag: rest.tag || "General",
        time: rest.time,
        title: rest.title,
      };
    });
    setJsonInput(JSON.stringify(cleanTemplate, null, 2));
  }, []);

  // Display temporary feedback messages
  const triggerFeedback = (type: "success" | "error" | "info", msg: string) => {
    setActionFeedback({ type, msg });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Helper to copy text to clipboard
  const copyToClipboard = async (text: string, successLabel: string = "Copied to clipboard!") => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        triggerFeedback("success", successLabel);
      } else {
        showAlert("Error", "Clipboard operations not supported in this browser.");
      }
    } catch {
      triggerFeedback("error", "Failed to copy to clipboard.");
    }
  };

  // Copy template JSON to clipboard
  const handleCopyTemplate = () => {
    const cleanTemplate = DEFAULT_TEMPLATE.map(({ id, ...rest }) => {
      const timeParts = parseTimeString(rest.time);
      return {
        hour: timeParts.hour,
        minute: timeParts.minute,
        meridiem: timeParts.meridiem,
        itemType: rest.itemType,
        pollUrl: rest.pollUrl || "",
        speaker: rest.speaker || "",
        tag: rest.tag || "General",
        time: rest.time,
        title: rest.title,
      };
    });
    copyToClipboard(JSON.stringify(cleanTemplate, null, 2), "Template JSON copied!");
  };

  // Parse Date string safely
  const parseDateString = (dateStr: string): Date => {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
    return new Date();
  };

  // Parse time e.g., "10:00 AM" into hour: 10, minute: 0, meridiem: "AM"
  const parseTimeString = (timeStr: string) => {
    const trimmed = timeStr.trim();
    
    // Match 12-hour format: e.g. "10:00 AM", "10AM", "1:30 PM"
    const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
      const hour = parseInt(match12[1], 10);
      const minute = match12[2] ? parseInt(match12[2], 10) : 0;
      const meridiem = match12[3].toUpperCase() as "AM" | "PM";
      return { hour, minute, meridiem };
    }

    // Match 24-hour format: e.g. "14:30", "09:00"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      let hour = parseInt(match24[1], 10);
      const minute = parseInt(match24[2], 10);
      let meridiem: "AM" | "PM" = "AM";
      if (hour >= 12) {
        meridiem = "PM";
        if (hour > 12) hour -= 12;
      } else if (hour === 0) {
        hour = 12;
      }
      return { hour, minute, meridiem };
    }

    // Default fallback
    return { hour: 12, minute: 0, meridiem: "AM" as const };
  };

  // Save changes back to Firestore
  const handleSaveToFirestore = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic validation
    if (!eventTitle.trim()) {
      setErrorMsg("Event Title is required.");
      return;
    }
    if (!eventDate.trim()) {
      setErrorMsg("Event Date is required.");
      return;
    }

    // Validate items
    for (let i = 0; i < agendaItems.length; i++) {
      const item = agendaItems[i];
      if (!item.time.trim() || !item.title.trim()) {
        setErrorMsg(`Agenda item #${i + 1} is missing a time or title.`);
        return;
      }
    }

    const confirmSave = Platform.OS === "web"
      ? window.confirm(`Are you sure you want to save this to Firestore? This will overwrite the live ${agendaType === "masterclass" ? "Masterclass" : "Synergy Sphere"} agenda.`)
      : true;

    if (!confirmSave) return;

    setSavingLive(true);
    try {
      const parsedDate = parseDateString(eventDate);
      
      // Structure matches the Firestore document schema exactly (with hour, minute, meridiem)
      const formattedItems = agendaItems.map(item => {
        const timeParts = parseTimeString(item.time);
        return {
          hour: timeParts.hour,
          minute: timeParts.minute,
          meridiem: timeParts.meridiem,
          itemType: item.itemType,
          pollUrl: item.itemType === "poll" ? (item.pollUrl?.trim() || "") : "",
          speaker: item.itemType === "session" ? (item.speaker?.trim() || "") : "",
          tag: item.tag || "General",
          time: item.time,
          title: item.title,
        };
      });

      const res = await saveAgenda(agendaType, eventTitle, parsedDate, formattedItems);
      
      if (res.success) {
        setSuccessMsg(`Successfully saved the ${agendaType === "masterclass" ? "Masterclass" : "Synergy Sphere"} agenda to Firestore!`);
        triggerFeedback("success", "Agenda saved to Firestore!");
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to save agenda: ${err.message}`);
      triggerFeedback("error", "Failed to save agenda");
    } finally {
      setSavingLive(false);
    }
  };

  // Load and parse JSON input
  const handleLoadJSON = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!jsonInput.trim()) {
      setErrorMsg("Please enter or paste some JSON text first.");
      return;
    }

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonInput.trim());
      } catch (err: any) {
        throw new Error(`JSON Syntax Error: ${err.message}. Please check for missing brackets, commas, or quotes.`);
      }

      let parsedAgenda: any[] = [];
      let parsedTitle = eventTitle;
      let parsedDate = eventDate;

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (parsed.title) parsedTitle = String(parsed.title);
        if (parsed.date) parsedDate = String(parsed.date);
        
        if (parsed.agenda && Array.isArray(parsed.agenda)) {
          parsedAgenda = parsed.agenda;
        } else if (parsed.items && Array.isArray(parsed.items)) {
          parsedAgenda = parsed.items;
        } else {
          throw new Error("JSON Object does not contain an 'agenda' or 'items' array.");
        }
      } 
      else if (Array.isArray(parsed)) {
        parsedAgenda = parsed;
      } else {
        throw new Error("Invalid structure. Must be either a JSON array of sessions or an object containing an 'agenda' array.");
      }

      // Map and validate agenda items
      const formattedItems: AgendaItem[] = parsedAgenda.map((item: any, idx: number) => {
        const title = item.title || item.name || item.sessionName;
        const time = item.time || item.sessionTime || item.hour || "";
        const speaker = item.speaker || item.presenter || item.host || "";
        const tag = item.tag || item.category || "General";
        
        let itemType: "session" | "poll" = "session";
        if (item.itemType === "poll" || item.type === "poll" || item.pollUrl) {
          itemType = "poll";
        }

        if (!title) {
          throw new Error(`Session at index ${idx} is missing a required 'title' or 'name' property.`);
        }

        return {
          id: `agenda-loaded-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          time: String(time).trim(),
          title: String(title).trim(),
          speaker: String(speaker).trim(),
          tag: String(tag).trim(),
          itemType,
          pollUrl: item.pollUrl ? String(item.pollUrl).trim() : undefined,
        };
      });

      setEventTitle(parsedTitle);
      setEventDate(parsedDate);
      setAgendaItems(formattedItems);
      setSuccessMsg(`Successfully loaded ${formattedItems.length} agenda sessions! Hit "Save to DB" to publish.`);
      triggerFeedback("success", `Loaded ${formattedItems.length} sessions!`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to parse agenda JSON.");
      triggerFeedback("error", "Failed to load JSON.");
    }
  };

  // Update item field values dynamically
  const updateItemField = (id: string, field: keyof AgendaItem, value: any) => {
    setAgendaItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "itemType" && value !== "poll") {
            delete updated.pollUrl;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Add a new empty session item with default titles matching types
  const handleAddNewItem = () => {
    const defaultTitles = agendaType === "masterclass" ? MASTERCLASS_TITLES : EVENT_TITLES;
    const defaultTitle = defaultTitles[agendaItems.length % defaultTitles.length];

    const newItem: AgendaItem = {
      id: `agenda-added-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time: "09:00 AM",
      title: defaultTitle,
      speaker: "",
      tag: "General",
      itemType: "session",
    };
    setAgendaItems(prev => [...prev, newItem]);
    triggerFeedback("info", "Added new session row");
  };

  // Delete a session item
  const handleDeleteItem = (id: string) => {
    setAgendaItems(prev => prev.filter(item => item.id !== id));
    triggerFeedback("info", "Deleted session row");
  };

  // Reorder items manually (up or down)
  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === agendaItems.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setAgendaItems(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
    triggerFeedback("info", `Moved item ${direction === "up" ? "up" : "down"}`);
  };

  // Sort all agenda items automatically by time chronologically
  const handleSortItems = () => {
    setAgendaItems(prev => {
      return [...prev].sort((a, b) => {
        const getMinutes = (item: AgendaItem) => {
          const parsed = parseTimeString(item.time);
          let h = parsed.hour;
          if (parsed.meridiem === "PM" && h !== 12) h += 12;
          if (parsed.meridiem === "AM" && h === 12) h = 0;
          return h * 60 + parsed.minute;
        };
        return getMinutes(a) - getMinutes(b);
      });
    });
    triggerFeedback("success", "Sorted sessions chronologically!");
  };

  const handleOpenLink = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        showAlert("Error", "Could not open the provided URL link.");
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="mx-auto w-full max-w-[1500px] px-4 py-8 md:px-8">
        
        {/* Floating Action Notifications */}
        {actionFeedback && (
          <View 
            className={`fixed top-5 right-5 z-50 rounded-2xl px-6 py-4 shadow-xl border flex-row items-center gap-3 transition-all ${
              actionFeedback.type === "success" 
                ? "bg-emerald-50 border-emerald-250 text-emerald-900" 
                : actionFeedback.type === "error" 
                ? "bg-rose-50 border-rose-250 text-rose-900" 
                : "bg-blue-50 border-blue-250 text-blue-900"
            }`}
            style={{ position: "fixed" as any }}
          >
            <Ionicons 
              name={actionFeedback.type === "success" ? "checkmark-circle" : actionFeedback.type === "error" ? "alert-circle" : "information-circle"} 
              size={20} 
              color={actionFeedback.type === "success" ? "#059669" : actionFeedback.type === "error" ? "#e11d48" : "#2563eb"} 
            />
            <Text className="text-sm font-bold text-slate-800">{actionFeedback.msg}</Text>
          </View>
        )}

        {/* Header Section */}
        <View className="mb-8 flex-col justify-between border-b border-slate-200 pb-6 md:flex-row md:items-center">
          <View>
            <Text className="text-3xl font-black tracking-tight text-slate-900 flex-row items-center gap-2">
              🚀 Bulk Agenda Studio
            </Text>
            <Text className="mt-1.5 text-sm font-medium text-slate-500">
              Paste agenda JSON or sync live database items, edit times/details, and publish directly to Cloud Firestore.
            </Text>
          </View>
          
          <View className="mt-4 flex-row items-center gap-3 md:mt-0">
            <View className="rounded-full bg-white px-4 py-2 border border-slate-200 flex-row items-center gap-2 shadow-sm">
              <View className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Text className="text-xs font-semibold text-slate-600">Live Firebase Connected</Text>
            </View>
          </View>
        </View>

        {/* Main Workspace Layout */}
        <View className="flex flex-col gap-8 lg:flex-row items-stretch">
          
          {/* LEFT PANEL: Live Firestore Selection & JSON Input */}
          <View className="w-full lg:w-5/12 flex flex-col gap-8">
            
            {/* Live Sync Controls Card */}
            <View className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm flex-col gap-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="sync-outline" size={20} color="#7c3aed" />
                <Text className="text-lg font-black text-slate-900">Firestore Sync Center</Text>
              </View>

              <Text className="text-xs leading-5 text-slate-500">
                Select the target agenda collection to fetch current database sessions or publish your edits.
              </Text>

              {/* Agenda Type Selectors */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setAgendaType("masterclass")}
                  disabled={fetchingLive || savingLive}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
                    agendaType === "masterclass"
                      ? "bg-purple-600 border-purple-600"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <View className={`h-4.5 w-4.5 rounded-full border items-center justify-center ${agendaType === "masterclass" ? "border-white bg-white" : "border-slate-300"}`}>
                    {agendaType === "masterclass" && <View className="h-2.5 w-2.5 rounded-full bg-purple-600" />}
                  </View>
                  <Text className={`text-xs font-bold ${agendaType === "masterclass" ? "text-white" : "text-slate-650"}`}>
                    Masterclass Agenda
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAgendaType("event")}
                  disabled={fetchingLive || savingLive}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
                    agendaType === "event"
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <View className={`h-4.5 w-4.5 rounded-full border items-center justify-center ${agendaType === "event" ? "border-white bg-white" : "border-slate-300"}`}>
                    {agendaType === "event" && <View className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                  </View>
                  <Text className={`text-xs font-bold ${agendaType === "event" ? "text-white" : "text-slate-650"}`}>
                    Synergy Sphere Event
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Live Sync Action */}
              <TouchableOpacity
                onPress={() => fetchLiveAgenda(agendaType)}
                disabled={fetchingLive || savingLive}
                className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 py-3.5 flex-row items-center justify-center gap-2"
              >
                {fetchingLive ? (
                  <ActivityIndicator size="small" color="#475569" />
                ) : (
                  <Ionicons name="refresh-outline" size={16} color="#475569" />
                )}
                <Text className="text-xs font-bold text-slate-700">
                  {fetchingLive ? "Syncing Live Data..." : "Force Reload from Firestore"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* JSON Upload Form Card */}
            <View className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm flex-col gap-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="code-working" size={20} color="#2563eb" />
                  <Text className="text-lg font-black text-slate-900">Paste JSON Input</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyTemplate}
                  className="flex-row items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 border border-blue-200 hover:bg-blue-100"
                >
                  <Ionicons name="copy-outline" size={13} color="#2563eb" />
                  <Text className="text-xs font-bold text-blue-600">Copy Template</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-xs leading-5 text-slate-500">
                Bulk overwrite the current sessions editor by pasting an agenda JSON below and hitting parse.
              </Text>

              <TextInput
                value={jsonInput}
                onChangeText={setJsonInput}
                multiline
                numberOfLines={12}
                placeholder={`{\n  "title": "Tech Summit 2026",\n  "date": "Monday, May 12, 2026",\n  "agenda": [\n    {\n      "time": "09:00 AM",\n      "title": "Opening Keynote",\n      "speaker": "John Doe",\n      "tag": "keynote"\n    }\n  ]\n}`}
                placeholderTextColor="#94a3b8"
                className="w-full rounded-2xl bg-slate-50 px-4 py-4 text-xs font-mono text-slate-800 border border-slate-200 min-h-[220px] text-left focus:border-blue-500/50 focus:bg-white"
                style={{ textAlignVertical: "top" }}
              />

              {errorMsg && (
                <View className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex-row items-start gap-3">
                  <Ionicons name="alert-circle" size={18} color="#e11d48" className="mt-0.5" />
                  <Text className="flex-1 text-xs font-semibold text-rose-700 leading-5">{errorMsg}</Text>
                </View>
              )}

              {successMsg && (
                <View className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex-row items-start gap-3">
                  <Ionicons name="checkmark-circle" size={18} color="#059669" className="mt-0.5" />
                  <Text className="flex-1 text-xs font-semibold text-emerald-700 leading-5">{successMsg}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleLoadJSON}
                disabled={fetchingLive || savingLive}
                className="w-full items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 py-4 shadow-sm"
              >
                <Text className="text-sm font-extrabold text-white">Parse & Load into Editor</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* RIGHT PANEL: Interactive Editor & Visual Mockup */}
          <View className="w-full lg:w-7/12 flex-1 flex-col gap-8">
            
            {/* Interactive Timeline Editor */}
            <View className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm flex-1 flex-col">
              <View className="mb-6 flex-row gap-4 border-b border-slate-200 pb-5 items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="create-outline" size={20} color="#7c3aed" />
                  <Text className="text-lg font-black text-slate-900">Interactive Editor</Text>
                </View>
                
                <View className="flex-row items-center gap-2">
                  {agendaItems.length > 1 && (
                    <TouchableOpacity
                      onPress={handleSortItems}
                      disabled={fetchingLive || savingLive}
                      className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 border border-slate-200 hover:bg-slate-200"
                    >
                      <Ionicons name="swap-vertical" size={13} color="#475569" />
                      <Text className="text-xs font-bold text-slate-700">Sort by Time</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleAddNewItem}
                    disabled={fetchingLive || savingLive}
                    className="flex-row items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 border border-purple-200 hover:bg-purple-100"
                  >
                    <Ionicons name="add" size={14} color="#7c3aed" />
                    <Text className="text-xs font-bold text-purple-700">Add Row</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveToFirestore}
                    disabled={fetchingLive || savingLive}
                    className="flex-row items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 shadow-sm"
                  >
                    {savingLive ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
                    )}
                    <Text className="text-xs font-bold text-white">
                      {savingLive ? "Saving..." : "Save to DB"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Event Meta Fields */}
              <View className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <View className="flex-1 bg-slate-50/80 p-4 border border-slate-200 rounded-2xl">
                  <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Event Title</Text>
                  <TextInput
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="E.g. Technical Seminar 2026"
                    placeholderTextColor="#94a3b8"
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-purple-500/40"
                  />
                </View>
                
                <View className="flex-1 bg-slate-50/80 p-4 border border-slate-200 rounded-2xl">
                  <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Event Date</Text>
                  <TextInput
                    value={eventDate}
                    onChangeText={setEventDate}
                    placeholder="E.g. Monday, May 12, 2026"
                    placeholderTextColor="#94a3b8"
                    className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-purple-500/40"
                  />
                </View>
              </View>

              {/* Session List */}
              <ScrollView nestedScrollEnabled className="flex-1 max-h-[600px] pr-1">
                {fetchingLive ? (
                  <View className="py-24 items-center justify-center">
                    <ActivityIndicator size="large" color="#7c3aed" />
                    <Text className="mt-4 text-sm font-semibold text-slate-500">Fetching live Firestore agenda...</Text>
                  </View>
                ) : agendaItems.length === 0 ? (
                  <View className="py-20 items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <Ionicons name="calendar-outline" size={48} color="#64748b" />
                    <Text className="mt-4 text-sm font-semibold text-slate-600">No sessions loaded in editor</Text>
                    <Text className="mt-1 text-xs text-slate-500">Paste and load JSON, or click &quot;Add Row&quot; to start.</Text>
                  </View>
                ) : (
                  <View className="gap-5">
                    {agendaItems.map((item, idx) => (
                      <View 
                        key={item.id} 
                        className="rounded-2xl bg-slate-50/50 border border-slate-200 p-5 flex-row gap-4 relative hover:border-slate-300 shadow-sm"
                      >
                        {/* Session Timeline Visual Line on the left */}
                        <View className="items-center w-6">
                          <View className="h-6 w-6 rounded-full bg-white border-2 border-purple-400 items-center justify-center shadow-sm">
                            <Text className="text-[10px] font-black text-purple-600">{idx + 1}</Text>
                          </View>
                          <View className="w-0.5 flex-1 bg-slate-200 my-2" />
                        </View>

                        {/* Interactive Editor Form Fields */}
                        <View className="flex-1 flex-col gap-4">
                          {/* Row 1: Time and Tag */}
                          <View className="flex-row gap-4">
                            <View className="flex-1">
                              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Time</Text>
                              <TextInput
                                value={item.time}
                                onChangeText={(val) => updateItemField(item.id, "time", val)}
                                placeholder="E.g. 10:00 AM"
                                placeholderTextColor="#94a3b8"
                                className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 focus:border-purple-500/50"
                              />
                            </View>
                            
                            {/* Tag Input */}
                            <View className="flex-1">
                              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tag / Category</Text>
                              <TextInput
                                value={item.tag}
                                onChangeText={(val) => updateItemField(item.id, "tag", val)}
                                placeholder="E.g. General"
                                placeholderTextColor="#94a3b8"
                                className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 focus:border-purple-500/50"
                              />
                            </View>
                          </View>

                          {/* Quick Tag Selectors Chips */}
                          <View className="-mt-1 flex-row flex-wrap gap-1.5">
                            {TAG_OPTIONS.map((tagOpt) => (
                              <TouchableOpacity
                                key={tagOpt}
                                onPress={() => updateItemField(item.id, "tag", tagOpt)}
                                className={`rounded px-2.5 py-1 border text-[9px] font-bold ${
                                  item.tag === tagOpt
                                    ? "bg-purple-100 border-purple-250 text-purple-700"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                                }`}
                              >
                                <Text className={`text-[9px] font-bold ${item.tag === tagOpt ? "text-purple-700" : "text-slate-500"}`}>{tagOpt}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Row 2: Title */}
                          <View>
                            <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Title</Text>
                            <TextInput
                              value={item.title}
                              onChangeText={(val) => updateItemField(item.id, "title", val)}
                              placeholder="Session Title"
                              placeholderTextColor="#94a3b8"
                              className="w-full rounded-xl bg-white px-3 py-2 text-xs text-slate-800 border border-slate-200 focus:border-purple-500/50"
                            />
                          </View>

                          {/* Row 3: Item Type Selectors */}
                          <View className="flex-row items-center gap-3">
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Item Type:</Text>
                            
                            <TouchableOpacity
                              onPress={() => updateItemField(item.id, "itemType", "session")}
                              className={`rounded-full px-3 py-1 border text-[10px] font-bold flex-row items-center gap-1 ${
                                item.itemType === "session"
                                  ? "bg-purple-100 border-purple-200 text-purple-700"
                                  : "bg-transparent border-slate-255 text-slate-400 border-slate-200"
                              }`}
                            >
                              <Ionicons name="videocam-outline" size={10} color={item.itemType === "session" ? "#7c3aed" : "#64748b"} />
                              <Text className={`text-[10px] font-bold ${item.itemType === "session" ? "text-purple-700" : "text-slate-600"}`}>Session</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => updateItemField(item.id, "itemType", "poll")}
                              className={`rounded-full px-3 py-1 border text-[10px] font-bold flex-row items-center gap-1 ${
                                item.itemType === "poll"
                                  ? "bg-amber-100 border-amber-250 text-amber-700"
                                  : "bg-transparent border-slate-255 text-slate-400 border-slate-200"
                              }`}
                            >
                              <Ionicons name="bar-chart-outline" size={10} color={item.itemType === "poll" ? "#b45309" : "#64748b"} />
                              <Text className={`text-[10px] font-bold ${item.itemType === "poll" ? "text-amber-700" : "text-slate-600"}`}>Poll / Form</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Row 4: Speaker (session) OR Poll URL (poll) */}
                          <View>
                            {item.itemType === "poll" ? (
                              <View>
                                <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Poll Url</Text>
                                <View className="flex-row gap-2">
                                  <TextInput
                                    value={item.pollUrl || ""}
                                    onChangeText={(val) => updateItemField(item.id, "pollUrl", val)}
                                    placeholder="https://example.com/poll-link"
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    className="flex-1 rounded-xl bg-white px-3 py-2 text-xs text-amber-700 border border-slate-200 focus:border-amber-500/50"
                                  />
                                  {item.pollUrl ? (
                                    <TouchableOpacity
                                      onPress={() => handleOpenLink(item.pollUrl)}
                                      className="rounded-xl bg-slate-100 border border-slate-200 px-3 justify-center items-center"
                                    >
                                      <Ionicons name="open-outline" size={14} color="#475569" />
                                    </TouchableOpacity>
                                  ) : null}
                                </View>
                              </View>
                            ) : (
                              <View>
                                <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Speaker / Presenter</Text>
                                <TextInput
                                  value={item.speaker}
                                  onChangeText={(val) => updateItemField(item.id, "speaker", val)}
                                  placeholder="Presenter Name"
                                  placeholderTextColor="#94a3b8"
                                  className="w-full rounded-xl bg-white px-3 py-2 text-xs text-slate-800 border border-slate-200 focus:border-purple-500/50"
                                />
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Top-Right Control Buttons (Delete, Reorder) */}
                        <View className="absolute top-4 right-4 flex-row items-center gap-1">
                          {/* Reorder Up */}
                          <TouchableOpacity
                            onPress={() => handleMoveItem(idx, "up")}
                            disabled={idx === 0 || fetchingLive || savingLive}
                            className={`h-7 w-7 rounded-full items-center justify-center border ${
                              idx === 0 
                                ? "bg-slate-50 border-slate-100 opacity-30" 
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Ionicons name="arrow-up" size={12} color={idx === 0 ? "#cbd5e1" : "#475569"} />
                          </TouchableOpacity>

                          {/* Reorder Down */}
                          <TouchableOpacity
                            onPress={() => handleMoveItem(idx, "down")}
                            disabled={idx === agendaItems.length - 1 || fetchingLive || savingLive}
                            className={`h-7 w-7 rounded-full items-center justify-center border ${
                              idx === agendaItems.length - 1 
                                ? "bg-slate-50 border-slate-100 opacity-30" 
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Ionicons name="arrow-down" size={12} color={idx === agendaItems.length - 1 ? "#cbd5e1" : "#475569"} />
                          </TouchableOpacity>

                          {/* Delete Row */}
                          <TouchableOpacity
                            onPress={() => handleDeleteItem(item.id)}
                            disabled={fetchingLive || savingLive}
                            className="h-7 w-7 rounded-full bg-red-50 border border-red-200 items-center justify-center hover:bg-red-100 ml-1"
                          >
                            <Ionicons name="trash-outline" size={12} color="#e11d48" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
              
              {/* Bottom Large Save Button */}
              {agendaItems.length > 0 && !fetchingLive && (
                <TouchableOpacity
                  onPress={handleSaveToFirestore}
                  disabled={savingLive}
                  className="mt-6 w-full items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 shadow-sm"
                >
                  <Text className="text-sm font-extrabold text-white flex-row items-center gap-2">
                    {savingLive ? "Saving Agenda Changes..." : "Publish Live to Firestore Database"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

          </View>

        </View>

      </View>
    </ScrollView>
  );
}
