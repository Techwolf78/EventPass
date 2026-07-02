import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllEventFeedback, EventFeedback } from "../utils/firestore";

export default function FormResponsesDashboard() {
  const [feedbacks, setFeedbacks] = useState<EventFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    mostResonated: "—",
    popCount: 0,
    guestLecturerCount: 0,
  });

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const data = await getAllEventFeedback();
      setFeedbacks(data);

      // Compute simple stats
      if (data.length > 0) {
        const favoriteCounts: Record<string, number> = {};
        let pop = 0;
        let guestLec = 0;

        data.forEach((f) => {
          // Count Q3 Favorite parts
          if (f.favoritePart) {
            favoriteCounts[f.favoritePart] = (favoriteCounts[f.favoritePart] || 0) + 1;
          }

          // Count Q4 Interests
          if (f.interests) {
            f.interests.forEach((interest) => {
              if (interest.includes("Professor of Practice")) pop++;
              if (interest.includes("Guest Lecturer")) guestLec++;
            });
          }
        });

        // Find most resonated part
        let maxCount = 0;
        let bestPart = "—";
        Object.entries(favoriteCounts).forEach(([part, count]) => {
          if (count > maxCount) {
            maxCount = count;
            bestPart = part;
          }
        });

        setStats({
          total: data.length,
          mostResonated: bestPart,
          popCount: pop,
          guestLecturerCount: guestLec,
        });
      }
    } catch (error) {
      console.error("Error loading feedback dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const downloadCSV = () => {
    if (feedbacks.length === 0) return;
    try {
      const headers = ["Timestamp", "Name", "Organisation", "Resonated Part", "Exploring Interests", "Experience Words"];
      const rows = feedbacks.map((f) => {
        const date = f.submittedAt?.toDate 
          ? f.submittedAt.toDate().toLocaleString() 
          : new Date(f.submittedAt as any).toLocaleString();
        
        return [
          `"${date}"`,
          `"${(f.name || "").replace(/"/g, '""')}"`,
          `"${(f.organisation || "").replace(/"/g, '""')}"`,
          `"${(f.favoritePart || "").replace(/"/g, '""')}"`,
          `"${(f.interests || []).join(", ").replace(/"/g, '""')}"`,
          `"${(f.experienceWords || "").replace(/"/g, '""')}"`
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Synergy_Sphere_2.0_Feedback_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("CSV download is only supported in web browsers.");
      }
    } catch (err) {
      console.error("Error generating CSV:", err);
      alert("Failed to export CSV");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading Dashboard Feedback...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Synergy Sphere 2.0</Text>
          <Text style={styles.headerSubtitle}>Post-Event Experience & Engagement Responses</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchFeedback}>
            <Ionicons name="refresh" size={16} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.csvButton} onPress={downloadCSV}>
            <Ionicons name="download" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.csvText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Responses</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={[styles.statCard, { flex: 2 }]}>
          <Text style={styles.statLabel}>Top Resonance Area</Text>
          <Text style={styles.statValue} numberOfLines={1}>{stats.mostResonated}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>POP Interests</Text>
          <Text style={styles.statValue}>{stats.popCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Guest Lecturers</Text>
          <Text style={styles.statValue}>{stats.guestLecturerCount}</Text>
        </View>
      </View>

      {/* Submissions Table / List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {feedbacks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No responses received yet.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.colHeader, { flex: 1.2 }]}>Timestamp</Text>
              <Text style={[styles.colHeader, { flex: 1.5 }]}>Name</Text>
              <Text style={[styles.colHeader, { flex: 1.8 }]}>Organisation</Text>
              <Text style={[styles.colHeader, { flex: 2.2 }]}>Resonated Part</Text>
              <Text style={[styles.colHeader, { flex: 2.5 }]}>Interests</Text>
              <Text style={[styles.colHeader, { flex: 2 }]}>Experience Words</Text>
            </View>

            {/* Table Body */}
            {feedbacks.map((f, idx) => {
              const formattedDate = f.submittedAt?.toDate 
                ? f.submittedAt.toDate().toLocaleString() 
                : new Date(f.submittedAt as any).toLocaleString();

              return (
                <View 
                  key={f.id || idx} 
                  style={[
                    styles.tableRow, 
                    idx % 2 === 1 ? { backgroundColor: "#f8fafc" } : null
                  ]}
                >
                  <Text style={[styles.cellText, { flex: 1.2, color: "#64748b" }]}>{formattedDate}</Text>
                  <Text style={[styles.cellText, { flex: 1.5, fontWeight: "700" }]}>{f.name}</Text>
                  <Text style={[styles.cellText, { flex: 1.8 }]}>{f.organisation}</Text>
                  <Text style={[styles.cellText, { flex: 2.2 }]}>{f.favoritePart}</Text>
                  <View style={[styles.chipCell, { flex: 2.5 }]}>
                    {(f.interests || []).map((interest, chipIdx) => (
                      <View key={chipIdx} style={styles.tableChip}>
                        <Text style={styles.tableChipText} numberOfLines={1}>
                          {interest}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.cellText, { flex: 2, fontStyle: "italic", color: "#475569" }]}>
                    {"\""}{f.experienceWords}{"\""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  refreshButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  refreshText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  csvButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  csvText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "700",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
  },
  colHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
  },
  chipCell: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tableChip: {
    backgroundColor: "#e0e7ff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  tableChipText: {
    fontSize: 10,
    color: "#4338ca",
    fontWeight: "700",
  },
}) as any;
