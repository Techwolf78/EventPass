import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { db } from "@/config/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getGuestList, GuestListItem } from "@/utils/firestore";

interface ExtendedGuest extends GuestListItem {
  phone?: string;
  whatsappSent?: boolean;
  status: "pending" | "registered";
}

interface MergeStats {
  success: number;
  notFound: number;
  failed: number;
}

export default function WhatsappDashboard() {
  const router = useRouter();

  // App download links configuration
  const [appName, setAppName] = useState("Gryphon Academy");
  const [iosLink, setIosLink] = useState("https://apps.apple.com/in/app/gryphon-academy/id6778033799");
  const [androidLink, setAndroidLink] = useState("https://play.google.com/store/apps/details?id=com.connecthq.eventpass");

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<
    "sphere_download" | "sphere_reminder" | "masterclass_download" | "masterclass_reminder"
  >("sphere_download");

  // Live guest list states
  const [guests, setGuests] = useState<ExtendedGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState<number | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Merge statistics
  const [mergeStats, setMergeStats] = useState<MergeStats | null>(null);
  const [processingMerge, setProcessingMerge] = useState(false);

  // Fetch live guest list from Firebase
  const loadLiveGuests = async () => {
    setLoading(true);
    setMergeStats(null);
    try {
      const liveList = await getGuestList();
      // Map Firestore fields to local state
      const mapped: ExtendedGuest[] = liveList.map((g: any) => ({
        ...g,
        phone: g.phone || g.phoneNumber || g.mobile || "",
        whatsappSent: g.whatsappSent || false,
      }));
      setGuests(mapped);
      if (mapped.length > 0) {
        setSelectedRecipientIndex(0);
      }
    } catch (error) {
      console.error("Error loading guests:", error);
      alert("Failed to load guests from Firestore");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveGuests();
  }, []);

  // Filter guest list by selected template enrollment category
  const filteredByTemplateGuests = useMemo(() => {
    const isSphere = selectedTemplate.startsWith("sphere");
    const targetType = isSphere ? "event" : "masterclass";
    
    let list = guests.filter(g => g.enrollmentType === targetType);

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        g => g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || (g.companyName && g.companyName.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [guests, selectedTemplate, searchQuery]);

  // Handle JSON phone number merge upload
  const handlePhoneMergeUpload = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setProcessingMerge(true);
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const json = JSON.parse(e.target.result);
        const mergeData = Array.isArray(json) ? json : [json];

        let success = 0;
        let notFound = 0;
        let failed = 0;

        // Create a fast lookup map for our local guest list
        const guestsMap = new Map<string, ExtendedGuest>();
        guests.forEach(g => {
          guestsMap.set(g.email.toLowerCase().trim(), g);
        });

        // We update Firestore documents
        const updatedGuests = [...guests];

        for (const item of mergeData) {
          const itemEmail = String(item.Email || item.email || "").toLowerCase().trim();
          const itemName = String(item.Name || item.name || "").toLowerCase().trim();
          const phoneVal = String(item.Phone || item.phone || item.Number || item.number || item.Mobile || item.mobile || "").trim();

          if (!phoneVal) {
            failed++;
            continue;
          }

          let matchedGuest = guestsMap.get(itemEmail);

          // Fallback to name search if email lookup failed
          if (!matchedGuest && itemName) {
            matchedGuest = updatedGuests.find(g => g.name.toLowerCase().trim() === itemName);
          }

          if (matchedGuest) {
            try {
              // Update in Firestore permanently
              const guestRef = doc(db, "guestList", matchedGuest.id);
              await setDoc(guestRef, { phone: phoneVal }, { merge: true });

              // Update in our local state list
              const index = updatedGuests.findIndex(g => g.id === matchedGuest!.id);
              if (index !== -1) {
                updatedGuests[index] = {
                  ...updatedGuests[index],
                  phone: phoneVal,
                };
              }
              success++;
            } catch (err) {
              console.error("Firestore merge update error:", err);
              failed++;
            }
          } else {
            notFound++;
          }
        }

        setGuests(updatedGuests);
        setMergeStats({ success, notFound, failed });
        alert(`Merge complete! matched: ${success}, not found: ${notFound}, failed: ${failed}`);
      } catch (err: any) {
        alert("Error parsing JSON merge file: " + err.message);
      } finally {
        setProcessingMerge(false);
      }
    };
    reader.readAsText(file);
  };

  // Update a single phone number manually
  const updateSinglePhone = async (id: string, newPhone: string) => {
    try {
      const guestRef = doc(db, "guestList", id);
      await setDoc(guestRef, { phone: newPhone.trim() }, { merge: true });

      setGuests(prev => prev.map(g => {
        if (g.id === id) {
          return { ...g, phone: newPhone.trim() };
        }
        return g;
      }));
    } catch (error) {
      console.error("Error manually updating phone:", error);
      alert("Failed to save phone number in database");
    }
  };

  // Download template JSON for matching numbers
  const downloadTemplateJson = () => {
    const templateData = [
      {
        "Name": "John Doe",
        "Email": "john.doe@example.com",
        "Phone": "+919876543210"
      },
      {
        "Name": "Jane Smith",
        "Email": "jane.smith@example.com",
        "Phone": "9876543211"
      }
    ];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templateData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "whatsapp_phone_mapping.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Generate templates content dynamically
  const generateMessageContent = (rec: ExtendedGuest) => {
    const name = rec.name;
    const email = rec.email;

    let text = "";

    switch (selectedTemplate) {
      case "sphere_download":
        text = `*Synergy Sphere 2.0 – Guest Pass & Guide*

Dear *${name}*,

To access the live event agenda and networking at Synergy Sphere 2.0, please download our official app *${appName}*.

*Login Details (Login as Guest):*
• Name: *${name}*
• Email: *${email}*

*Download App:*
• iOS: ${iosLink}
• Android: ${androidLink}

Looking forward to welcoming you!

Warm regards,
*Gryphon Academy Team*`;
        break;

      case "sphere_reminder":
        text = `*Synergy Sphere 2.0 – Reminder*

Dear *${name}*,

We look forward to hosting you tomorrow for *Synergy Sphere 2.0*!

Please ensure you have downloaded the official app *${appName}* on your device to keep your digital pass ready for a seamless check-in.

*Download App:*
• iOS: ${iosLink}
• Android: ${androidLink}

See you tomorrow evening!

Warm regards,
*Gryphon Academy Team*`;
        break;

      case "masterclass_download":
        text = `*Masterclass 3.0 – Guest Pass & Guide*

Dear *${name}*,

Please download the official app *${appName}* to access your pass, live agenda, and schedule for *Masterclass 3.0*.

*Login Details (Login as Guest):*
• Name: *${name}*
• Email: *${email}*

*Download App:*
• iOS: ${iosLink}
• Android: ${androidLink}

Warm regards,
*Gryphon Academy Team*`;
        break;

      case "masterclass_reminder":
        text = `*Masterclass 3.0 – Reminder*

Dear *${name}*,

We are excited to host you tomorrow for *Masterclass 3.0*!

Please download the official app *${appName}* on your device to keep your digital pass active for a quick check-in.

*Download App:*
• iOS: ${iosLink}
• Android: ${androidLink}

See you tomorrow!

Warm regards,
*Gryphon Academy Team*`;
        break;
    }

    return text;
  };

  const openManualChat = async (rec: ExtendedGuest) => {
    if (!rec.phone) {
      alert("Please enter a phone number first!");
      return;
    }

    // Strip all non-digits
    let cleaned = rec.phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned; // default country code India
    }
    const message = generateMessageContent(rec);
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    
    // Open chat thread
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    }

    try {
      // Mark as sent in Firestore
      const guestRef = doc(db, "guestList", rec.id);
      await setDoc(guestRef, { whatsappSent: true }, { merge: true });

      // Update locally
      setGuests(prev => prev.map(g => {
        if (g.id === rec.id) {
          return { ...g, whatsappSent: true };
        }
        return g;
      }));
    } catch (err) {
      console.error("Firestore whatsappSent update error:", err);
    }
  };

  const selectedRec = selectedRecipientIndex !== null && filteredByTemplateGuests[selectedRecipientIndex]
    ? filteredByTemplateGuests[selectedRecipientIndex]
    : null;
  const previewText = selectedRec ? generateMessageContent(selectedRec) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#10B981" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <View>
              <Text style={styles.title}>WhatsApp Click-to-Chat Campaign Manager</Text>
              <Text style={styles.subtitle}>Open direct chat threads with pending guests from your live database</Text>
            </View>
            <TouchableOpacity onPress={loadLiveGuests} style={styles.refreshButton}>
              <Ionicons name="refresh" size={16} color="#10B981" />
              <Text style={styles.refreshButtonText}>Sync Database</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Merge Status Banner */}
      {mergeStats && (
        <View style={styles.statsBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.statsBannerText}>
            Phone Merge Stats: <Text style={{ color: "#10B981", fontWeight: "bold" }}>{mergeStats.success} Success</Text> |{" "}
            <Text style={{ color: "#EF4444", fontWeight: "bold" }}>{mergeStats.notFound} Guest Not Found (Wrong)</Text> |{" "}
            <Text style={{ color: "#F59E0B", fontWeight: "bold" }}>{mergeStats.failed} Failed</Text>
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={{ color: "#94A3B8", marginTop: 10 }}>Syncing guests with Firestore...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {/* Left Column - Setup & Merging */}
          <View style={styles.columnLeft}>
            {/* App Link Config */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>App Links Settings</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>App Name</Text>
                <TextInput style={styles.input} value={appName} onChangeText={setAppName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>iOS App Store Download Link</Text>
                <TextInput style={styles.input} value={iosLink} onChangeText={setIosLink} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Android Google Play Download Link</Text>
                <TextInput style={styles.input} value={androidLink} onChangeText={setAndroidLink} />
              </View>
            </View>

            {/* Campaign details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Campaign Details</Text>
              
              {/* Template Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Choose WhatsApp Template</Text>
                <View style={styles.selectContainer}>
                  <select
                    value={selectedTemplate}
                    onChange={(e: any) => setSelectedTemplate(e.target.value)}
                    style={{
                      backgroundColor: "#1E293B",
                      color: "#FFFFFF",
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#334155",
                      fontSize: 14,
                      width: "100%",
                      outline: "none",
                    }}
                  >
                    <option value="sphere_download">Synergy Sphere 2.0: App Download & Guide</option>
                    <option value="sphere_reminder">Synergy Sphere 2.0: Day Before Reminder</option>
                    <option value="masterclass_download">Masterclass 3.0: App Download & Guide</option>
                    <option value="masterclass_reminder">Masterclass 3.0: Day Before Reminder</option>
                  </select>
                </View>
              </View>

              {/* Phone Map JSON upload */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.label}>Merge WhatsApp Numbers JSON</Text>
                  <TouchableOpacity onPress={downloadTemplateJson} style={styles.downloadTemplateLink}>
                    <Text style={styles.downloadTemplateText}>Download Schema JSON</Text>
                  </TouchableOpacity>
                </View>
                <div style={{ marginTop: 8 }}>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handlePhoneMergeUpload}
                    disabled={processingMerge}
                    style={{
                      color: "#94A3B8",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <Text style={styles.helperText}>
                  Matches guests by email/name and automatically saves their numbers in the live Firestore database.
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column - Table & Live Preview */}
          <View style={styles.columnRight}>
            {/* Table */}
            <View style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "bold" }}>
                  Attendees List ({filteredByTemplateGuests.length})
                </Text>
                {/* Search Bar */}
                <TextInput
                  style={[styles.input, { width: 220, paddingVertical: 6, fontSize: 12 }]}
                  placeholder="Search guests..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#E2E8F0" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155" }}>
                      <th style={{ textAlign: "left", padding: 8, fontSize: 12, color: "#94A3B8" }}>Name</th>
                      <th style={{ textAlign: "left", padding: 8, fontSize: 12, color: "#94A3B8" }}>WhatsApp Number</th>
                      <th style={{ textAlign: "center", padding: 8, fontSize: 12, color: "#94A3B8" }}>App Status</th>
                      <th style={{ textAlign: "right", padding: 8, fontSize: 12, color: "#94A3B8" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredByTemplateGuests.map((rec, index) => (
                      <tr
                        key={rec.id}
                        onClick={() => setSelectedRecipientIndex(index)}
                        style={{
                          borderBottom: "1px solid #1E293B",
                          backgroundColor: selectedRecipientIndex === index ? "#1E293B" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: 8, fontSize: 13 }}>
                          <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>{rec.name}</Text>
                          <Text style={{ color: "#94A3B8", fontSize: 11 }}>{rec.email}</Text>
                        </td>
                        <td style={{ padding: 8, fontSize: 13 }}>
                          <TextInput
                            style={{
                              backgroundColor: "#0F172A",
                              color: "#FFFFFF",
                              borderWidth: 1,
                              borderColor: "#334155",
                              borderRadius: 4,
                              paddingVertical: 2,
                              paddingHorizontal: 6,
                              fontSize: 12,
                              width: 120,
                            }}
                            placeholder="Enter number..."
                            placeholderTextColor="#475569"
                            defaultValue={rec.phone || ""}
                            onEndEditing={(e) => updateSinglePhone(rec.id, e.nativeEvent.text)}
                          />
                        </td>
                        <td style={{ padding: 8, textAlign: "center" }}>
                          {rec.status === "registered" ? (
                            <span style={{ color: "#10B981", fontSize: 11, fontWeight: "bold" }}>App Installed</span>
                          ) : rec.whatsappSent ? (
                            <span style={{ color: "#60A5FA", fontSize: 11, fontWeight: "bold" }}>Chat Sent</span>
                          ) : (
                            <span style={{ color: "#F59E0B", fontSize: 11 }}>Pending Pass</span>
                          )}
                        </td>
                        <td style={{ padding: 8, textAlign: "right" }}>
                          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                            {rec.status === "pending" ? (
                              <TouchableOpacity
                                style={[styles.chatActionBtn, !rec.phone && styles.disabledBtn]}
                                onPress={() => openManualChat(rec)}
                                disabled={!rec.phone}
                              >
                                <Text style={styles.rowActionText}>Chat</Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={{ color: "#10B981", fontSize: 14 }}>✓</Text>
                            )}
                          </View>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollView>
            </View>

            {/* WhatsApp Chat Preview */}
            {previewText && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Live WhatsApp Chat Preview</Text>
                <View style={styles.chatBackground}>
                  <View style={styles.chatBubble}>
                    <Text style={styles.chatMessageText}>
                      {previewText}
                    </Text>
                    <Text style={styles.chatTimeText}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: "#1E293B",
    borderRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "bold",
  },
  statsBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  statsBannerText: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  grid: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 20,
  },
  columnLeft: {
    flex: Platform.OS === "web" ? 1 : undefined,
    gap: 20,
  },
  columnRight: {
    flex: Platform.OS === "web" ? 1.3 : undefined,
    gap: 20,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 14,
  },
  selectContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  helperText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  chatActionBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  rowActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.4,
  },
  downloadTemplateLink: {
    paddingVertical: 2,
  },
  downloadTemplateText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  // WhatsApp Chat Preview mockup styling
  chatBackground: {
    backgroundColor: "#0B141A", // Dark theme WhatsApp chat background
    padding: 16,
    borderRadius: 8,
    minHeight: 180,
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: "#222E35",
  },
  chatBubble: {
    backgroundColor: "#005C4B", // WhatsApp Dark Green outgoing chat bubble
    alignSelf: "flex-end",
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderTopRightRadius: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  chatMessageText: {
    color: "#E9EDEF",
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: Platform.OS === "web" ? "monospace, monospace" : "Courier",
  },
  chatTimeText: {
    color: "#8696A0",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
});
