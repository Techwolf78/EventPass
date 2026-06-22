import React, { useState, useEffect } from "react";
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

// SMTP configurations and download links storage keys
const SMTP_STORAGE_KEY = "gryphon_smtp_config";

interface Recipient {
  name: string;
  email: string;
  status?: "pending" | "sending" | "success" | "failed";
  error?: string;
}

export default function EmailDashboard() {
  const router = useRouter();

  // SMTP state
  const [host, setHost] = useState("smtp.office365.com");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState("synergysphere@gryphonacademy.co.in");
  const [pass, setPass] = useState("Master3379@");
  const [fromName, setFromName] = useState("Synergy Sphere");
  const [fromEmail, setFromEmail] = useState("synergysphere@gryphonacademy.co.in");

  // App download links configuration
  const [iosLink, setIosLink] = useState("https://apps.apple.com/in/app/gryphon-academy/id6778033799");
  const [androidLink, setAndroidLink] = useState("https://play.google.com/store/apps/details?id=com.connecthq.eventpass");
  const [appName, setAppName] = useState("Gryphon Academy");

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<
    "sphere_download" | "sphere_reminder" | "masterclass_download" | "masterclass_reminder"
  >("sphere_download");

  // Auto-switch default credentials based on selected campaign branding
  useEffect(() => {
    if (selectedTemplate.startsWith("sphere")) {
      setUser("synergysphere@gryphonacademy.co.in");
      setFromEmail("synergysphere@gryphonacademy.co.in");
      setFromName("Synergy Sphere");
      setPass("Master3379@");
    } else if (selectedTemplate.startsWith("masterclass")) {
      setUser("masterclass@gryphonacademy.co.in");
      setFromEmail("masterclass@gryphonacademy.co.in");
      setFromName("Gryphon Academy");
      setPass("Master902@");
    }
  }, [selectedTemplate]);

  // Recipients list
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState<number | null>(null);

  // Status & logs
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [serverStatus, setServerStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [attachedPdf, setAttachedPdf] = useState<{ filename: string; content: string } | null>(null);

  // Load saved SMTP configuration
  useEffect(() => {
    try {
      if (Platform.OS === "web") {
        const saved = localStorage.getItem(SMTP_STORAGE_KEY);
        if (saved) {
          const config = JSON.parse(saved);
          if (config.host) setHost(config.host);
          if (config.port) setPort(config.port);
          if (config.secure !== undefined) setSecure(config.secure);
          if (config.user) setUser(config.user);
          if (config.pass) setPass(config.pass);
          if (config.fromName) setFromName(config.fromName);
          if (config.fromEmail) setFromEmail(config.fromEmail);
          if (config.iosLink && !config.iosLink.includes("connecthq-eventpass")) setIosLink(config.iosLink);
          if (config.androidLink) setAndroidLink(config.androidLink);
          if (config.appName && config.appName !== "ConnectHQ") setAppName(config.appName);
        }
      }
    } catch (e) {
      console.error("Failed to load SMTP config", e);
    }
    checkServerHealth();
  }, []);

  // Save SMTP config to local storage
  const saveSmtpConfig = () => {
    try {
      const config = { host, port, secure, user, pass, fromName, fromEmail, iosLink, androidLink, appName };
      if (Platform.OS === "web") {
        localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(config));
        alert("Configuration saved successfully!");
      }
    } catch (e) {
      console.error("Failed to save SMTP config", e);
    }
  };

  const checkServerHealth = async () => {
    try {
      setConnectionMessage("Checking mail server health...");
      // Simple POST with empty body to check server presence
      const res = await fetch("http://localhost:3001/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 400) {
        // 400 is expected because we sent no body, but it means server is active!
        setServerStatus("online");
        setConnectionMessage("Local mail server is ONLINE on http://localhost:3001");
      } else {
        setServerStatus("offline");
        setConnectionMessage("Server returned unexpected status. Make sure it's running.");
      }
    } catch {
      setServerStatus("offline");
      setConnectionMessage("Offline. Run 'npm run email-server' in another terminal.");
    }
  };

  const downloadTemplateJson = () => {
    const templateData = [
      {
        "Name": "John Doe",
        "Email": "john.doe@example.com"
      },
      {
        "Name": "Jane Smith",
        "Email": "jane.smith@example.com"
      }
    ];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templateData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "attendees_template.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle JSON upload
  const handleJsonUpload = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const json = JSON.parse(e.target.result);
        const list = Array.isArray(json) ? json : [json];
        const parsedList: Recipient[] = list.map((item: any) => {
          return {
            name: item.Name || item.name || "Attendee",
            email: item.Email || item.email || "",
            status: "pending" as const,
          };
        }).filter(r => r.email); // Must have email

        setRecipients(parsedList);
        if (parsedList.length > 0) {
          setSelectedRecipientIndex(0);
        }
      } catch (err: any) {
        alert("Error parsing JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Generate templates content dynamically
  const generateMailContent = (rec: Recipient) => {
    const name = rec.name;
    const email = rec.email;

    let subject = "";
    let html = "";
    let text = "";

    switch (selectedTemplate) {
      case "sphere_download":
        subject = `App Download & Guide - Synergy Sphere 2.0`;
        text = `Dear ${name},

Greetings from Gryphon Academy Pvt. Ltd.

We are dedicated to providing a memorable and impactful experience for all our esteemed attendees. To ensure you stay perfectly connected throughout Synergy Sphere 2.0 - The Adventurous Intelligence, we request you to download our official event app ${appName}.

The ${appName} serves as your personalized gateway to every aspect of the evening. Through the app, you will enjoy seamless access to:

· The Live Event Agenda: Plan your evening timeline with absolute precision.
· Exclusive Networking: View attendee profiles and connect effortlessly with fellow corporate leaders and pioneers.
· Real-Time Updates: Receive instant notifications regarding sessions, reveals, and evening highlights.

Please find your login details below:

Registered Name: ${name}
Registered Email: ${email}

(No password is required. Simply enter the above Registered Name and Registered Email on the App's Guest login screen to gain instant access.)

Please use the secure link below to download the application onto your device:

For iOS: ${iosLink}
For Android: ${androidLink}

We have provided a brief visual guide below to ensure your setup is completed with ease.

Warm regards,`;

        html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Dear ${name},</h3>
            <p>Greetings from <strong>Gryphon Academy Pvt. Ltd.</strong></p>
            <p>We are dedicated to providing a memorable and impactful experience for all our esteemed attendees. To ensure you stay perfectly connected throughout <strong>Synergy Sphere 2.0 - The Adventurous Intelligence</strong>, we request you to download our official event app <strong>${appName}</strong>.</p>
            <p>The <strong>${appName}</strong> serves as your personalized gateway to every aspect of the evening. Through the app, you will enjoy seamless access to:</p>
            <ul style="padding-left: 20px; color: #4a5568;">
              <li style="margin-bottom: 8px;"><strong>The Live Event Agenda:</strong> Plan your evening timeline with absolute precision.</li>
              <li style="margin-bottom: 8px;"><strong>Exclusive Networking:</strong> View attendee profiles and connect effortlessly with fellow corporate leaders and pioneers.</li>
              <li style="margin-bottom: 8px;"><strong>Real-Time Updates:</strong> Receive instant notifications regarding sessions, reveals, and evening highlights.</li>
            </ul>
            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #2d3748; border-bottom: 1px solid #edf2f7; padding-bottom: 8px;">Your App Login Details:</h4>
              <p style="margin: 0; color: #4a5568;"><strong>Registered Name:</strong> <span style="color: #1a202c; font-weight: bold;">${name}</span></p>
              <p style="margin: 8px 0 0 0; color: #4a5568;"><strong>Registered Email:</strong> <span style="color: #1a202c; font-weight: bold;">${email}</span></p>
              <p style="margin: 12px 0 0 0; font-size: 13px; color: #718096; font-style: italic;">Note: No password is required. Simply enter the above Registered Name and Registered Email on the App's Guest login screen to gain instant access.</p>
            </div>
            <p>Please use the secure links below to download the application onto your device:</p>
            <div style="margin: 20px 0;">
              <a href="${iosLink}" style="background-color: #000000; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 24px; margin-bottom: 10px;">Download for iOS</a>
              <a href="${androidLink}" style="background-color: #10b981; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-bottom: 10px;">Download for Android</a>
            </div>
            <p style="font-size: 13px; color: #718096;">We have provided a brief visual guide below to ensure your setup is completed with ease.</p>
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="margin-bottom: 0; color: #718096;">Warm regards,</p>
            <p style="margin-top: 4px; font-weight: bold; color: #1e3a8a;">Gryphon Academy Team</p>
          </div>
        `;
        break;

      case "sphere_reminder":
        subject = `One Day to Go – Synergy Sphere 2.0`;
        text = `Dear ${name},

Greetings from Gryphon Academy Pvt. Ltd.

We are absolutely thrilled to host you tomorrow for our highly anticipated flagship evening, Synergy Sphere 2.0. The venue is prepared, our speakers are set, and the stage is ready for a landmark gathering of corporate and academic minds.

As you finalize your schedule, please take a quick moment to download and set up the official ${appName} if you have not already done so. Completing this quick step ensures your digital pass is fully active for a seamless arrival at our registration desk.

Download Your App Here: ${androidLink} (Android) or ${iosLink} (iOS)

Having the app ready on your phone guarantees instant access to the event timeline, live panel participation, and our premium networking suite the moment you arrive.

We look forward to sharing an unforgettable, inspiring experience with you tomorrow evening.

Warm regards,`;

        html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Dear ${name},</h3>
            <p>Greetings from <strong>Gryphon Academy Pvt. Ltd.</strong></p>
            <p>We are absolutely thrilled to host you tomorrow for our highly anticipated flagship evening, <strong>Synergy Sphere 2.0</strong>. The venue is prepared, our speakers are set, and the stage is ready for a landmark gathering of corporate and academic minds.</p>
            <p>As you finalize your schedule, please take a quick moment to download and set up the official <strong>${appName}</strong> if you have not already done so. Completing this quick step ensures your digital pass is fully active for a seamless arrival at our registration desk.</p>
            <div style="margin: 24px 0;">
              <a href="${iosLink}" style="background-color: #000000; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 24px; margin-bottom: 10px;">Download for iOS</a>
              <a href="${androidLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-bottom: 10px;">Download for Android</a>
            </div>
            <p>Having the app ready on your phone guarantees instant access to the event timeline, live panel participation, and our premium networking suite the moment you arrive.</p>
            <p>We look forward to sharing an unforgettable, inspiring experience with you tomorrow evening.</p>
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
            <p style="margin-bottom: 0; color: #718096;">Warm regards,</p>
            <p style="margin-top: 4px; font-weight: bold; color: #1e3a8a;">Gryphon Academy Team</p>
          </div>
        `;
        break;

      case "masterclass_download":
        subject = `Email: App Download & Guide – Masterclass 3.0`;
        text = `Dear ${name},

Greetings from Gryphon Academy Pvt. Ltd.

We are dedicated to providing a memorable and impactful experience for all our esteemed attendees. To ensure you stay perfectly connected throughout Masterclass 3.0 – The Adventurous Intelligence, we request you to download our official event app ${appName}.

The ${appName} serves as your personalized gateway to every aspect of the day. Through the app, you will enjoy seamless access to:

· The Live Event Agenda – Plan your day with absolute precision
· Session Details & Speaker Profiles – Learn more about the experts and sessions
· Exclusive Networking – View attendee profiles and connect with fellow educators, trainers, and academic leaders
· Real-Time Updates – Receive instant notifications regarding session timings, reveals, and event highlights

Please find your login details below:

Registered Name: ${name}
Registered Email: ${email}

(No password is required. Simply enter the above Registered Name and Registered Email on the App's Guest login screen to gain instant access.)

Please use the secure link below to download the application onto your device:

For iOS: ${iosLink}
For Android: ${androidLink}

We have provided a brief visual guide below to ensure your setup is completed with ease.

Warm regards,
Gryphon Academy Team`;

        html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
            <h3 style="color: #0f766e; margin-top: 0;">Dear ${name},</h3>
            <p>Greetings from <strong>Gryphon Academy Pvt. Ltd.</strong></p>
            <p>We are dedicated to providing a memorable and impactful experience for all our esteemed attendees. To ensure you stay perfectly connected throughout <strong>Masterclass 3.0 – The Adventurous Intelligence</strong>, we request you to download our official event app <strong>${appName}</strong>.</p>
            <p>The <strong>${appName}</strong> serves as your personalized gateway to every aspect of the day. Through the app, you will enjoy seamless access to:</p>
            <ul style="padding-left: 20px; color: #4a5568;">
              <li style="margin-bottom: 8px;"><strong>The Live Event Agenda</strong> – Plan your day with absolute precision</li>
              <li style="margin-bottom: 8px;"><strong>Session Details & Speaker Profiles</strong> – Learn more about the experts and sessions</li>
              <li style="margin-bottom: 8px;"><strong>Exclusive Networking</strong> – View attendee profiles and connect with fellow educators, trainers, and academic leaders</li>
              <li style="margin-bottom: 8px;"><strong>Real-Time Updates</strong> – Receive instant notifications regarding session timings, reveals, and event highlights</li>
            </ul>
            <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0f766e; border-bottom: 1px solid #ccfbf1; padding-bottom: 8px;">Your App Login Details:</h4>
              <p style="margin: 0; color: #4a5568;"><strong>Registered Name:</strong> <span style="color: #0f766e; font-weight: bold;">${name}</span></p>
              <p style="margin: 8px 0 0 0; color: #4a5568;"><strong>Registered Email:</strong> <span style="color: #0f766e; font-weight: bold;">${email}</span></p>
              <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">Note: No password is required. Simply enter the above Registered Name and Registered Email on the App's Guest login screen to gain instant access.</p>
            </div>
            <p>Please use the secure links below to download the application onto your device:</p>
            <div style="margin: 20px 0;">
              <a href="${iosLink}" style="background-color: #000000; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 24px; margin-bottom: 10px;">Download for iOS</a>
              <a href="${androidLink}" style="background-color: #0f766e; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-bottom: 10px;">Download for Android</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">We have provided a brief visual guide below to ensure your setup is completed with ease.</p>
            <hr style="border: 0; border-top: 1px solid #ccfbf1; margin: 20px 0;" />
            <p style="margin-bottom: 0; color: #64748b;">Warm regards,</p>
            <p style="margin-top: 4px; font-weight: bold; color: #0f766e;">Gryphon Academy Team</p>
          </div>
        `;
        break;

      case "masterclass_reminder":
        subject = `One Day to Go – Set Up Your App for Masterclass 3.0`;
        text = `Dear ${name},

Greetings from Gryphon Academy Pvt. Ltd.

We are absolutely thrilled to host you tomorrow for our highly anticipated flagship gathering, Masterclass 3.0 – The Adventurous Intelligence. The venue is prepared, our speakers are set, and the stage is ready for a landmark day of learning and collaboration.

As you finalize your schedule, please take a quick moment to download and set up the official ${appName} if you have not already done so. Completing this quick step ensures your digital pass is fully active for a seamless arrival at our registration desk.

Download Your App Here: ${androidLink} (Android) or ${iosLink} (iOS)

Having the app ready on your phone guarantees instant access to the event timeline, session details, and live updates the moment you arrive.

We look forward to sharing an unforgettable, inspiring experience with you tomorrow.

Warm regards,
Gryphon Academy Team`;

        html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff;">
            <h3 style="color: #0f766e; margin-top: 0;">Dear ${name},</h3>
            <p>Greetings from <strong>Gryphon Academy Pvt. Ltd.</strong></p>
            <p>We are absolutely thrilled to host you tomorrow for our highly anticipated flagship gathering, <strong>Masterclass 3.0 – The Adventurous Intelligence</strong>. The venue is prepared, our speakers are set, and the stage is ready for a landmark day of learning and collaboration.</p>
            <p>As you finalize your schedule, please take a quick moment to download and set up the official <strong>${appName}</strong> if you have not already done so. Completing this quick step ensures your digital pass is fully active for a seamless arrival at our registration desk.</p>
            <div style="margin: 24px 0;">
              <a href="${iosLink}" style="background-color: #000000; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 24px; margin-bottom: 10px;">Download for iOS</a>
              <a href="${androidLink}" style="background-color: #0f766e; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; margin-bottom: 10px;">Download for Android</a>
            </div>
            <p>Having the app ready on your phone guarantees instant access to the event timeline, session details, and live updates the moment you arrive.</p>
            <p>We look forward to sharing an unforgettable, inspiring experience with you tomorrow.</p>
            <hr style="border: 0; border-top: 1px solid #ccfbf1; margin: 20px 0;" />
            <p style="margin-bottom: 0; color: #64748b;">Warm regards,</p>
            <p style="margin-top: 4px; font-weight: bold; color: #0f766e;">Gryphon Academy Team</p>
          </div>
        `;
        break;
    }

    return { subject, html, text };
  };

  // Send single email via backend local server
  const sendEmail = async (index: number) => {
    const rec = recipients[index];
    if (!rec) return;

    // Update status to sending
    setRecipients(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "sending", error: undefined };
      return copy;
    });

    const { subject, html, text } = generateMailContent(rec);

    const smtpConfig = {
      host,
      port,
      secure,
      auth: { user, pass },
      fromName,
      fromEmail,
    };

    const mailOptions: any = {
      to: rec.email,
      subject,
      html,
      text,
    };

    if (selectedTemplate === "sphere_download") {
      mailOptions.pdfFilename = "SYNERGY SPHERE APP STEP GUIDE.pdf";
    } else if (selectedTemplate === "masterclass_download") {
      mailOptions.pdfFilename = "MASTERCLASS STEP GUIDE.pdf";
    }

    if (attachedPdf) {
      mailOptions.attachments = [
        {
          filename: attachedPdf.filename,
          content: attachedPdf.content,
          encoding: "base64",
        }
      ];
    }

    try {
      const response = await fetch("http://localhost:3001/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpConfig, mailOptions }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setRecipients(prev => {
          const copy = [...prev];
          copy[index] = { ...copy[index], status: "success" };
          return copy;
        });
        return true;
      } else {
        throw new Error(data.error || "Failed sending email");
      }
    } catch (e: any) {
      setRecipients(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], status: "failed", error: e.message };
        return copy;
      });
      return false;
    }
  };

  // Send all emails sequentially with 1 second delay
  const sendAllEmails = async () => {
    if (recipients.length === 0) {
      alert("No recipients loaded!");
      return;
    }
    if (!pass) {
      alert("Please enter SMTP Password!");
      return;
    }

    setIsBulkSending(true);

    for (let i = 0; i < recipients.length; i++) {
      // Only send if it hasn't succeeded yet
      if (recipients[i].status !== "success") {
        await sendEmail(i);
        // Wait 1.5 seconds between emails to respect SMTP rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setIsBulkSending(false);
    alert("Bulk sending operation complete!");
  };

  const selectedRec = selectedRecipientIndex !== null ? recipients[selectedRecipientIndex] : null;
  const previewData = selectedRec ? generateMailContent(selectedRec) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#60A5FA" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>SMTP Email Campaign Manager</Text>
          <Text style={styles.subtitle}>Send App Details & Reminders to Attendees</Text>
        </View>
      </View>

      {/* Server Health Status */}
      <View style={[styles.card, styles.healthCard]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: serverStatus === "online" ? "#10B981" : serverStatus === "offline" ? "#EF4444" : "#F59E0B" },
            ]}
          />
          <Text style={styles.healthText}>{connectionMessage}</Text>
        </View>
        <TouchableOpacity onPress={checkServerHealth} style={styles.refreshButton}>
          <Ionicons name="refresh" size={16} color="#60A5FA" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {/* Left Column - Configurations */}
        <View style={styles.columnLeft}>
          {/* SMTP Settings */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SMTP Settings (Outlook Defaults)</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SMTP Host</Text>
              <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="smtp.office365.com" />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Port</Text>
                <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="587" keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1, justifyContent: "center" }]}>
                <Text style={styles.label}>SSL / Secure</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, secure && styles.toggleBtnActive]}
                  onPress={() => setSecure(!secure)}
                >
                  <Text style={[styles.toggleBtnText, secure && styles.toggleBtnTextActive]}>
                    {secure ? "Enabled (SSL)" : "Disabled (TLS/STARTTLS)"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username / Email</Text>
              <TextInput
                style={styles.input}
                value={user}
                onChangeText={(val) => {
                  setUser(val);
                  setFromEmail(val);
                }}
                placeholder="synergysphere@gryphonacademy.co.in"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password (App Password / Outlook Password)</Text>
              <TextInput
                style={styles.input}
                value={pass}
                onChangeText={setPass}
                placeholder="••••••••••••"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Sender Display Name</Text>
                <TextInput style={styles.input} value={fromName} onChangeText={setFromName} placeholder="Gryphon Academy" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Reply-To Email</Text>
                <TextInput style={styles.input} value={fromEmail} onChangeText={setFromEmail} placeholder="synergysphere@gryphonacademy.co.in" autoCapitalize="none" />
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={saveSmtpConfig}>
              <Text style={styles.primaryButtonText}>Save SMTP Settings Local</Text>
            </TouchableOpacity>
          </View>

          {/* App Config */}
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
        </View>

        {/* Right Column - Campaign Controls */}
        <View style={styles.columnRight}>
          {/* File Upload & Template Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Campaign Details</Text>
            
            {/* Template Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choose Email Template</Text>
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

            {/* JSON File Input */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.label}>Upload Attendees JSON File</Text>
                <TouchableOpacity onPress={downloadTemplateJson} style={styles.downloadTemplateLink}>
                  <Text style={styles.downloadTemplateText}>Download Sample JSON</Text>
                </TouchableOpacity>
              </View>
              <div style={{ marginTop: 8 }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleJsonUpload}
                  style={{
                    color: "#94A3B8",
                    fontSize: "14px",
                  }}
                />
              </div>
              <Text style={styles.helperText}>
                JSON format: array of objects with Name and Email keys.
              </Text>
            </View>

            {/* PDF Attachment Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Attach PDF Guide (Optional)</Text>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e: any) => {
                    const file = e.target.files[0];
                    if (!file) {
                      setAttachedPdf(null);
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (readerEvent: any) => {
                      const base64Data = readerEvent.target.result.split(',')[1];
                      setAttachedPdf({
                        filename: file.name,
                        content: base64Data
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                  style={{
                    color: "#94A3B8",
                    fontSize: "14px",
                  }}
                />
                {attachedPdf && (
                  <TouchableOpacity
                    onPress={() => setAttachedPdf(null)}
                    style={{
                      backgroundColor: "#EF4444",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </div>
              {attachedPdf && (
                <Text style={{ color: "#10B981", fontSize: 11, marginTop: 4 }}>
                  Attached: {attachedPdf.filename}
                </Text>
              )}
            </View>

            {recipients.length > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <Text style={{ color: "#E2E8F0", fontWeight: "bold" }}>
                  Loaded Accounts: {recipients.length}
                </Text>
                <TouchableOpacity
                  style={[styles.sendAllBtn, (isBulkSending || serverStatus !== "online") && styles.disabledBtn]}
                  onPress={sendAllEmails}
                  disabled={isBulkSending || serverStatus !== "online"}
                >
                  {isBulkSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.sendAllBtnText}>Send All Emails</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Accounts List & Table */}
          {recipients.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recipients</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", color: "#E2E8F0" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155" }}>
                      <th style={{ textAlign: "left", padding: 8, fontSize: 13, color: "#94A3B8" }}>Name</th>
                      <th style={{ textAlign: "left", padding: 8, fontSize: 13, color: "#94A3B8" }}>Email</th>
                      <th style={{ textAlign: "center", padding: 8, fontSize: 13, color: "#94A3B8" }}>Status</th>
                      <th style={{ textAlign: "right", padding: 8, fontSize: 13, color: "#94A3B8" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((rec, index) => (
                      <tr
                        key={index}
                        onClick={() => setSelectedRecipientIndex(index)}
                        style={{
                          borderBottom: "1px solid #1E293B",
                          backgroundColor: selectedRecipientIndex === index ? "#1E293B" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: 8, fontSize: 13 }}>{rec.name}</td>
                        <td style={{ padding: 8, fontSize: 13 }}>{rec.email}</td>
                        <td style={{ padding: 8, textAlign: "center" }}>
                          {rec.status === "success" && (
                            <span style={{ color: "#10B981", fontSize: 12, fontWeight: "bold" }}>Sent</span>
                          )}
                          {rec.status === "failed" && (
                            <span style={{ color: "#EF4444", fontSize: 12, fontWeight: "bold" }} title={rec.error}>Failed</span>
                          )}
                          {rec.status === "sending" && (
                            <span style={{ color: "#60A5FA", fontSize: 12 }}>Sending...</span>
                          )}
                          {rec.status === "pending" && (
                            <span style={{ color: "#94A3B8", fontSize: 12 }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: 8, textAlign: "right" }}>
                          <TouchableOpacity
                            style={[
                              styles.rowActionBtn,
                              (rec.status === "sending" || serverStatus !== "online") && styles.disabledBtn,
                            ]}
                            onPress={() => sendEmail(index)}
                            disabled={rec.status === "sending" || serverStatus !== "online"}
                          >
                            <Text style={styles.rowActionText}>Send</Text>
                          </TouchableOpacity>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollView>
            </View>
          )}

          {/* Email Preview */}
          {previewData && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Live Email Preview</Text>
              <View style={styles.previewSubjectContainer}>
                <Text style={{ color: "#94A3B8", fontWeight: "bold", fontSize: 13 }}>Subject:</Text>
                <Text style={{ color: "#E2E8F0", fontSize: 13, marginLeft: 8 }}>{previewData.subject}</Text>
              </View>
              <ScrollView style={styles.previewHtmlContainer}>
                <div
                  dangerouslySetInnerHTML={{ __html: previewData.html }}
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: 12,
                    borderRadius: 6,
                  }}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </View>
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
  healthCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: "#0F172A",
    borderColor: "#334155",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  healthText: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#475569",
  },
  refreshButtonText: {
    color: "#60A5FA",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
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
  toggleBtn: {
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#3B82F6",
  },
  toggleBtnText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
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
  },
  sendAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendAllBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  rowActionBtn: {
    backgroundColor: "#3B82F6",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: "flex-end",
  },
  rowActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  previewSubjectContainer: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  previewHtmlContainer: {
    maxHeight: 400,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 4,
  },
  downloadTemplateLink: {
    paddingVertical: 2,
  },
  downloadTemplateText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
