import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getGuestList,
  addGuest,
  addGuestsFromCSV,
  deleteGuest,
  GuestListItem,
  getCheckedInCandidateIds,
  registerAndCheckInPendingGuest,
} from "@/utils/firestore";

type EnrollmentType = "masterclass" | "event";

export default function WebAgendaDashboard() {
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>("event");
  const [companyName, setCompanyName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isVIP, setIsVIP] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // JSON Input states
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<string | null>(null);
  const [importingJson, setImportingJson] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | EnrollmentType | "vip">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "arrived" | "unarrived" | "pending">("all");

  const loadData = async () => {
    try {
      const [list, checkIns] = await Promise.all([
        getGuestList(),
        getCheckedInCandidateIds(),
      ]);
      setGuests(list);
      setCheckedInIds(new Set(checkIns));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSingleGuest = async () => {
    if (!name.trim() || !email.trim()) {
      showAlert("Error", "Name and email are required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await addGuest(
        name.trim(),
        email.toLowerCase().trim(),
        enrollmentType,
        linkedinUrl.trim() || undefined,
        companyName.trim() || undefined,
        isVIP
      );
      
      showAlert(res.success ? "Success" : "Error", res.message);
      if (res.success) {
        setName("");
        setEmail("");
        setCompanyName("");
        setLinkedinUrl("");
        setIsVIP(false);
        loadData();
      }
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to add guest");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportJSON = async () => {
    setJsonError(null);
    setJsonSuccess(null);
    if (!jsonInput.trim()) {
      setJsonError("Please paste a valid JSON array of guests.");
      return;
    }

    setImportingJson(true);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonInput.trim());
      } catch {
        throw new Error("Invalid JSON format. Please check syntax (missing commas, brackets, etc.)");
      }

      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of guest objects.");
      }

      const formattedGuests = parsed.map((item: any, idx: number) => {
        const name = item.name || item.fullName || item.Name;
        const email = item.email || item.Email;
        
        let typeRaw = (item.enrollmentType || item.type || item.enrollment || "").toString().toLowerCase();
        let finalType: EnrollmentType = "event";
        if (typeRaw.includes("masterclass") || typeRaw.includes("class")) {
          finalType = "masterclass";
        } else if (typeRaw.includes("event") || typeRaw.includes("sphere") || typeRaw.includes("synergy")) {
          finalType = "event";
        } else {
          finalType = "event";
        }

        if (!name || !email) {
          throw new Error(`Guest at index ${idx} is missing a required name or email field.`);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error(`Guest at index ${idx} ("${name}") has an invalid email format.`);
        }

        return {
          name: name.toString().trim(),
          email: email.toString().toLowerCase().trim(),
          enrollmentType: finalType,
          company: (item.company || item.companyName || item.organization || "").toString().trim() || undefined,
          linkedinUrl: (item.linkedinUrl || item.linkedin || "").toString().trim() || undefined,
          isVIP: !!(item.vip || item.isVIP || item.VIP),
        };
      });

      if (formattedGuests.length === 0) {
        throw new Error("No guest records found in the pasted array.");
      }

      const res = await addGuestsFromCSV(formattedGuests);
      if (res.success) {
        setJsonSuccess(`Successfully imported all ${res.added} guest(s)!`);
        setJsonInput("");
      } else {
        setJsonSuccess(`Import complete: ${res.added} added successfully. ${res.failed} failed.`);
        if (res.failures && res.failures.length > 0) {
          const failMsg = res.failures.map(f => `• ${f.name} (${f.email}): ${f.error}`).join("\n");
          setJsonError(`Some entries failed to import:\n${failMsg}`);
        }
      }
      loadData();
    } catch (err: any) {
      setJsonError(err.message || "An unexpected error occurred during import.");
    } finally {
      setImportingJson(false);
    }
  };

  const handleManualCheckIn = async (guest: GuestListItem) => {
    const targetEventId = "test-event";
    const status = getGuestStatus(guest);

    if (status === "arrived") {
      showAlert("Checked In", `${guest.name} is already checked in.`);
      return;
    }

    setLoading(true);
    try {
      const result = await registerAndCheckInPendingGuest(
        guest.id,
        targetEventId,
        "web-dashboard-admin"
      );
      showAlert(result.success ? "Success" : "Error", result.message);
      loadData();
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to check in guest");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guest: GuestListItem) => {
    const confirmed = Platform.OS === "web" 
      ? window.confirm(`Are you sure you want to delete ${guest.name} from the guest list?`)
      : true;

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await deleteGuest(guest.id);
      showAlert(res.success ? "Success" : "Error", res.message);
      loadData();
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to delete guest");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const copyTemplateToClipboard = async () => {
    const template = JSON.stringify([
      {
        name: "Alex Mercer",
        email: "alex@mercer.com",
        enrollmentType: "event",
        company: "Gryphon Tech",
        linkedinUrl: "https://linkedin.com/in/alex",
        vip: true
      },
      {
        name: "Sarah Connor",
        email: "sarah@cyberdyne.com",
        enrollmentType: "masterclass",
        company: "Cyberdyne Systems",
        vip: false
      }
    ], null, 2);

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(template);
        showAlert("Copied!", "JSON template copied to clipboard.");
      } else {
        showAlert("Error", "Clipboard not supported on this device/browser.");
      }
    } catch {
      showAlert("Error", "Failed to copy template.");
    }
  };

  const getGuestStatus = useCallback((guest: GuestListItem): "arrived" | "unarrived" | "pending" => {
    if (guest.status === "registered") {
      return checkedInIds.has(guest.id) ? "arrived" : "unarrived";
    }
    return "pending";
  }, [checkedInIds]);

  // Stats calculations
  const stats = useMemo(() => {
    const total = guests.length;
    const masterclasses = guests.filter(g => g.enrollmentType === "masterclass").length;
    const events = guests.filter(g => g.enrollmentType === "event").length;
    const vips = guests.filter(g => g.isVIP).length;
    const checkedIn = guests.filter(g => getGuestStatus(g) === "arrived").length;
    const unarrived = guests.filter(g => getGuestStatus(g) === "unarrived").length;
    const pending = guests.filter(g => getGuestStatus(g) === "pending").length;

    return { total, masterclasses, events, vips, checkedIn, unarrived, pending };
  }, [guests, getGuestStatus]);

  const filteredGuests = useMemo(() => {
    let result = [...guests];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        g => g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || (g.companyName && g.companyName.toLowerCase().includes(q))
      );
    }

    // Enrollment type filter
    if (filterType === "masterclass") {
      result = result.filter(g => g.enrollmentType === "masterclass");
    } else if (filterType === "event") {
      result = result.filter(g => g.enrollmentType === "event");
    } else if (filterType === "vip") {
      result = result.filter(g => g.isVIP);
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter(g => getGuestStatus(g) === filterStatus);
    }

    // Sort by registration / name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [guests, searchQuery, filterType, filterStatus, getGuestStatus]);

  const [testingCheckIn, setTestingCheckIn] = useState(false);

  const handleTestCheckInRandomGuests = async () => {
    const unarrivedGuests = guests.filter(g => getGuestStatus(g) !== "arrived");
    if (unarrivedGuests.length === 0) {
      showAlert("No Guests", "No unarrived guests found to check in.");
      return;
    }

    // Pick up to 5 random ones
    const shuffled = [...unarrivedGuests].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    setTestingCheckIn(true);
    showAlert("Test Started", `Checking in ${selected.length} random guests with a 2-second delay...`);

    const targetEventId = "test-event";

    for (let i = 0; i < selected.length; i++) {
      const guest = selected[i];
      try {
        console.log(`[Testing] Checking in ${guest.name} (${i + 1}/${selected.length})...`);
        await registerAndCheckInPendingGuest(
          guest.id,
          targetEventId,
          "web-dashboard-admin"
        );
        await loadData();
      } catch (error: any) {
        console.error(`[Testing] Failed to check in ${guest.name}:`, error);
      }

      if (i < selected.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setTestingCheckIn(false);
    showAlert("Test Completed", "Finished checking in random guests.");
  };

  return (
    <ScrollView className="flex-1 bg-slate-50">
      <View className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">
        
        {/* Header */}
        <View className="mb-8 flex-col justify-between border-b border-slate-200 pb-6 md:flex-row md:items-center">
          <View>
            <Text className="text-3xl font-black tracking-tight text-slate-900">
              EventPass Admin
            </Text>
            <Text className="mt-1 text-sm font-medium text-slate-500">
              Web Dashboard & Guest Registration Portal
            </Text>
          </View>
          <View className="mt-4 flex-row flex-wrap items-center gap-3 md:mt-0">
            <View className="rounded-full bg-white px-4 py-2 border border-slate-200 flex-row items-center gap-2 shadow-sm">
              <View className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Text className="text-xs font-semibold text-slate-600">Live Firebase DB Connected</Text>
            </View>
            <TouchableOpacity 
              onPress={handleTestCheckInRandomGuests}
              disabled={testingCheckIn}
              className={`rounded-full px-4 py-2 border flex-row items-center gap-2 shadow-sm ${
                testingCheckIn ? "bg-amber-100 border-amber-300" : "bg-amber-500 border-amber-600 hover:bg-amber-600"
              }`}
            >
              {testingCheckIn ? (
                <ActivityIndicator size="small" color="#d97706" />
              ) : (
                <Ionicons name="flask" size={14} color="#fff" />
              )}
              <Text className={`text-xs font-bold ${testingCheckIn ? "text-amber-800" : "text-white"}`}>
                {testingCheckIn ? "Testing..." : "Test 5 Check-ins (2s)"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={loadData}
              className="rounded-full bg-white p-2.5 border border-slate-200 hover:bg-slate-50 shadow-sm"
            >
              <Ionicons name="refresh" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-4 lg:flex lg:flex-row lg:justify-between">
          <View className="flex-1 min-w-[150px] rounded-2xl bg-white p-5 border border-slate-200 m-1 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Guests</Text>
            <Text className="mt-2 text-3xl font-black text-slate-900">{stats.total}</Text>
          </View>
          <View className="flex-1 min-w-[150px] rounded-2xl bg-white p-5 border border-slate-200 m-1 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-red-500">Synergy Sphere</Text>
            <Text className="mt-2 text-3xl font-black text-red-600">{stats.events}</Text>
          </View>
          <View className="flex-1 min-w-[150px] rounded-2xl bg-white p-5 border border-slate-200 m-1 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-indigo-500">Masterclass</Text>
            <Text className="mt-2 text-3xl font-black text-indigo-600">{stats.masterclasses}</Text>
          </View>
          <View className="flex-1 min-w-[150px] rounded-2xl bg-white p-5 border border-slate-200 m-1 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-amber-500">VIP Guests</Text>
            <Text className="mt-2 text-3xl font-black text-amber-600">{stats.vips}</Text>
          </View>
          <View className="flex-1 min-w-[150px] rounded-2xl bg-white p-5 border border-slate-200 m-1 shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-500">Checked In</Text>
            <Text className="mt-2 text-3xl font-black text-emerald-600">{stats.checkedIn}</Text>
          </View>
        </View>

        {/* Dashboard Panels Layout */}
        <View className="flex flex-col gap-8 lg:flex-row">
          
          {/* LEFT: Registration & Batch Import Form Panels */}
          <View className="w-full lg:w-5/12 flex flex-col gap-8">
            
            {/* Panel 1: Single Guest Registration */}
            <View className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
              <View className="mb-5 flex-row items-center gap-2">
                <Ionicons name="person-add" size={20} color="#2563eb" />
                <Text className="text-lg font-black text-slate-900">Register Guest</Text>
              </View>

              <View className="gap-4">
                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-600">Full Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter guest's full name"
                    placeholderTextColor="#94a3b8"
                    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 border border-slate-200 focus:border-blue-500 focus:bg-white"
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-600">Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter guest's email"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 border border-slate-200 focus:border-blue-500 focus:bg-white"
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-600">Company Name</Text>
                  <TextInput
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Enter company name (optional)"
                    placeholderTextColor="#94a3b8"
                    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 border border-slate-200 focus:border-blue-500 focus:bg-white"
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold text-slate-600">LinkedIn URL</Text>
                  <TextInput
                    value={linkedinUrl}
                    onChangeText={setLinkedinUrl}
                    placeholder="https://linkedin.com/in/username (optional)"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 border border-slate-200 focus:border-blue-500 focus:bg-white"
                  />
                </View>

                {/* Enrollment Type Selectors */}
                <View>
                  <Text className="mb-2 text-xs font-bold text-slate-600">Enrollment Option</Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setEnrollmentType("event")}
                      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
                        enrollmentType === "event"
                          ? "bg-red-600 border-red-600"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <View className={`h-4.5 w-4.5 rounded-full border items-center justify-center ${enrollmentType === "event" ? "border-white bg-white" : "border-slate-300"}`}>
                        {enrollmentType === "event" && <View className="h-2.5 w-2.5 rounded-full bg-red-600" />}
                      </View>
                      <Text className={`text-xs font-bold ${enrollmentType === "event" ? "text-white" : "text-slate-600"}`}>
                        Synergy Sphere
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setEnrollmentType("masterclass")}
                      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
                        enrollmentType === "masterclass"
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <View className={`h-4.5 w-4.5 rounded-full border items-center justify-center ${enrollmentType === "masterclass" ? "border-white bg-white" : "border-slate-300"}`}>
                        {enrollmentType === "masterclass" && <View className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
                      </View>
                      <Text className={`text-xs font-bold ${enrollmentType === "masterclass" ? "text-white" : "text-slate-600"}`}>
                        Masterclass
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* VIP Switch */}
                <TouchableOpacity
                  onPress={() => setIsVIP(!isVIP)}
                  className="flex-row items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="star" size={16} color={isVIP ? "#d97706" : "#64748b"} />
                    <View>
                      <Text className="text-sm font-bold text-slate-800">VIP Guest Status</Text>
                      <Text className="text-xs text-slate-500">Enable premium privileges</Text>
                    </View>
                  </View>
                  <View className={`h-6 w-11 rounded-full p-0.5 ${isVIP ? "bg-amber-500" : "bg-slate-250"}`}>
                    <View className={`h-5 w-5 rounded-full bg-white shadow-sm transition-all ${isVIP ? "translate-x-5" : ""}`} />
                  </View>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleAddSingleGuest}
                  disabled={submitting}
                  className="mt-2 w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 hover:bg-blue-700 disabled:opacity-55"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-sm font-extrabold text-white">Create Guest Record</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Panel 2: Paste JSON Field for Batch Import */}
            <View className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="code-working" size={20} color="#7c3aed" />
                  <Text className="text-lg font-black text-slate-900">JSON Batch Import</Text>
                </View>
                <TouchableOpacity
                  onPress={copyTemplateToClipboard}
                  className="flex-row items-center gap-1 rounded bg-purple-50 px-2.5 py-1.5 border border-purple-200 hover:bg-purple-100"
                >
                  <Ionicons name="copy-outline" size={12} color="#7c3aed" />
                  <Text className="text-[10px] font-bold text-purple-700">Copy Template</Text>
                </TouchableOpacity>
              </View>
              <Text className="mb-4 text-xs text-slate-500">
                Paste a JSON array containing guest records to import multiple attendees instantly.
              </Text>

              <View className="gap-4">
                <TextInput
                  value={jsonInput}
                  onChangeText={setJsonInput}
                  multiline
                  numberOfLines={10}
                  placeholder={`[\n  {\n    "name": "Alex Mercer",\n    "email": "alex@mercer.com",\n    "enrollmentType": "event",\n    "company": "Gryphon Tech",\n    "linkedinUrl": "https://linkedin.com/in/alex",\n    "vip": true\n  }\n]`}
                  placeholderTextColor="#94a3b8"
                  className="w-full rounded-xl bg-slate-50 px-4 py-3 text-xs font-mono text-slate-700 border border-slate-200 min-h-[180px] text-left focus:bg-white"
                  style={{ textAlignVertical: "top" }}
                />

                {jsonError && (
                  <View className="rounded-xl bg-red-550/10 border border-red-200 p-3 flex-row items-start gap-2">
                    <Ionicons name="alert-circle" size={16} color="#dc2626" className="mt-0.5" />
                    <Text className="flex-1 text-xs font-bold text-red-700 leading-5">{jsonError}</Text>
                  </View>
                )}

                {jsonSuccess && (
                  <View className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex-row items-start gap-2">
                    <Ionicons name="checkmark-circle" size={16} color="#059669" className="mt-0.5" />
                    <Text className="flex-1 text-xs font-bold text-emerald-700 leading-5">{jsonSuccess}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleImportJSON}
                  disabled={importingJson}
                  className="w-full items-center justify-center rounded-xl bg-purple-600 py-3.5 hover:bg-purple-700 disabled:opacity-55"
                >
                  {importingJson ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-sm font-extrabold text-white">Import JSON Array</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

          </View>

          {/* RIGHT: Guest List Dashboard Panel */}
          <View className="w-full lg:w-7/12 rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex-1">
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="people" size={20} color="#d97706" />
                <Text className="text-lg font-black text-slate-900">Guest Directory</Text>
              </View>
              <Text className="text-xs font-bold text-slate-500">
                Showing {filteredGuests.length} of {guests.length}
              </Text>
            </View>

            {/* Search Input */}
            <View className="mb-4 flex-row items-center rounded-xl bg-slate-50 px-4 border border-slate-200 focus-within:border-slate-350 focus-within:bg-white">
              <Ionicons name="search" size={16} color="#475569" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, email, company..."
                placeholderTextColor="#94a3b8"
                className="flex-1 px-3 py-3 text-sm text-slate-900"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filters Bar */}
            <View className="mb-5 flex-col gap-3">
              {/* Category Filter */}
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterType("all")}
                  className={`rounded-full px-4 py-1.5 border text-xs font-bold ${
                    filterType === "all"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Text className={`text-xs font-bold ${filterType === "all" ? "text-white" : "text-slate-600"}`}>
                    All Types
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterType("event")}
                  className={`rounded-full px-4 py-1.5 border text-xs font-bold ${
                    filterType === "event"
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Text className={`text-xs font-bold ${filterType === "event" ? "text-white" : "text-slate-600"}`}>
                    Synergy Sphere
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterType("masterclass")}
                  className={`rounded-full px-4 py-1.5 border text-xs font-bold ${
                    filterType === "masterclass"
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Text className={`text-xs font-bold ${filterType === "masterclass" ? "text-white" : "text-slate-600"}`}>
                    Masterclass
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterType("vip")}
                  className={`rounded-full px-4 py-1.5 border text-xs font-bold ${
                    filterType === "vip"
                      ? "bg-amber-500 border-amber-500 text-slate-900"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Text className={`text-xs font-bold ${filterType === "vip" ? "text-slate-900" : "text-slate-600"}`}>
                    VIP Only
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Filter */}
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterStatus("all")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    filterStatus === "all" ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Text className="text-xs font-bold text-slate-700">All Status</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterStatus("arrived")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    filterStatus === "arrived" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Text className="text-xs font-bold text-emerald-700">Arrived / Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterStatus("unarrived")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    filterStatus === "unarrived" ? "bg-orange-50 text-orange-700 border border-orange-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Text className="text-xs font-bold text-orange-700">Unarrived</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterStatus("pending")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    filterStatus === "pending" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Text className="text-xs font-bold text-blue-700">Pending Reg</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Directory Cards List */}
            {loading ? (
              <View className="py-20 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : filteredGuests.length === 0 ? (
              <View className="py-16 items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <Ionicons name="people-outline" size={48} color="#94a3b8" />
                <Text className="mt-4 text-sm font-semibold text-slate-500">No matching guests found</Text>
                <Text className="mt-1 text-xs text-slate-400">Try refining your search or filter options</Text>
              </View>
            ) : (
              <View className="gap-3.5">
                {filteredGuests.map((guest) => {
                  const status = getGuestStatus(guest);
                  let statusColor = "bg-blue-50 text-blue-700 border border-blue-200";
                  let statusText = "Pending Registration";
                  
                  if (status === "arrived") {
                    statusColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                    statusText = "Arrived / Checked In";
                  } else if (status === "unarrived") {
                    statusColor = "bg-orange-50 text-orange-700 border border-orange-200";
                    statusText = "Registered (Unarrived)";
                  }

                  return (
                    <View
                      key={guest.id}
                      className="rounded-xl bg-white p-4 border border-slate-200 flex-col gap-3 md:flex-row md:items-center md:justify-between hover:border-slate-350 shadow-sm"
                    >
                      <View className="flex-row items-center gap-3">
                        {/* Initials Avatar */}
                        <View 
                          className="h-10 w-10 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: guest.enrollmentType === "event" ? "rgba(239, 68, 68, 0.1)" : "rgba(79, 70, 229, 0.1)",
                            borderWidth: 1,
                            borderColor: guest.enrollmentType === "event" ? "rgba(239, 68, 68, 0.2)" : "rgba(79, 70, 229, 0.2)",
                          }}
                        >
                          <Text 
                            className="text-sm font-bold"
                            style={{ color: guest.enrollmentType === "event" ? "#dc2626" : "#4f46e5" }}
                          >
                            {(guest.name.split(" ").map(n => n[0]).join("").substring(0, 2) || "G").toUpperCase()}
                          </Text>
                        </View>

                        <View>
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-sm font-bold text-slate-900">{guest.name}</Text>
                            {guest.isVIP && (
                              <View className="rounded bg-amber-100 px-1.5 py-0.5 border border-amber-200">
                                <Text className="text-[10px] font-black text-amber-700">VIP</Text>
                              </View>
                            )}
                            <View 
                              className={`rounded px-1.5 py-0.5 border ${
                                guest.enrollmentType === "event" 
                                  ? "bg-red-50 border-red-200" 
                                  : "bg-indigo-50 border-indigo-200"
                              }`}
                            >
                              <Text 
                                className={`text-[10px] font-extrabold ${
                                  guest.enrollmentType === "event" ? "text-red-700" : "text-indigo-700"
                                }`}
                              >
                                {guest.enrollmentType === "event" ? "Synergy Sphere" : "Masterclass"}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-xs text-slate-500 mt-0.5">{guest.email}</Text>
                          {guest.companyName ? (
                            <Text className="text-[11px] text-slate-600 mt-1 flex-row items-center">
                              🏢 {guest.companyName}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Right Section: Status Badge & Actions */}
                      <View className="flex-row items-center justify-end gap-3 mt-2 md:mt-0 border-t border-slate-100 pt-2.5 md:border-t-0 md:pt-0">
                        
                        {/* Status badge */}
                        <View className={`rounded-full px-2.5 py-1 ${statusColor}`}>
                          <Text className="text-[10px] font-extrabold">{statusText}</Text>
                        </View>

                        {/* Action buttons */}
                        <View className="flex-row items-center gap-1.5">
                          {status !== "arrived" && (
                            <TouchableOpacity
                              onPress={() => handleManualCheckIn(guest)}
                              className="rounded bg-emerald-50 p-1.5 border border-emerald-200 hover:bg-emerald-100"
                            >
                              <Ionicons name="checkmark-done" size={14} color="#059669" />
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity
                            onPress={() => handleDelete(guest)}
                            className="rounded bg-red-50 p-1.5 border border-red-200 hover:bg-red-100"
                          >
                            <Ionicons name="trash" size={14} color="#dc2626" />
                          </TouchableOpacity>
                        </View>

                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          
        </View>

      </View>
    </ScrollView>
  );
}
