import { auth, db } from "@/config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

// Custom random token generator for Expo compatibility (avoids crypto error)
const generateToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// ============== TYPE DEFINITIONS ==============
export interface GuestListItem {
  id: string;
  name: string;
  nameLower: string;
  email: string;
  status: "pending" | "registered";
  registeredAt: Timestamp | null;
  qrToken: string | null;
  enrollmentType: "masterclass" | "event";
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: "attendee" | "speaker" | "volunteer";
  department: string;
  qrToken: string;
  fcmToken: string;
  registeredAt: Timestamp;
  enrollmentType: "masterclass" | "event";
}

export interface EventData {
  id: string;
  title: string;
  date: Timestamp;
  agenda: {
    time: string;
    title: string;
    speaker: string;
    tag: string;
  }[];
}

export interface AttendanceRecord {
  id: string;
  candidateId: string;
  eventId: string;
  scannedAt: Timestamp;
  scannedBy: string;
}

/**
 * Get user role and data from Firestore users collection
 */
export async function getUserData(uid: string): Promise<{
  role: UserRole;
  email?: string;
  name?: string;
} | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as { role: UserRole; email: string; name: string };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// ============== REGISTRATION LOGIC ==============
export interface RegistrationResult {
  success: boolean;
  message?: string;
  qrToken?: string;
}

export interface GuestLoginResult {
  success: boolean;
  message?: string;
  qrToken?: string;
}

/**
 * Validates and registers a new attendee with user-provided password
 * Returns QR token on success or error message on failure
 */
export async function validateAndRegisterAttendee(
  inputName: string,
  inputEmail: string,
  fcmToken: string,
  password: string,
  department: string = "",
): Promise<RegistrationResult> {
  const trimmedName = inputName.trim();
  const lowerEmail = inputEmail.toLowerCase().trim();
  const deptToStore = department.trim();

  try {
    // Step 1: Query guestList by email
    const guestQuery = query(
      collection(db, "guestList"),
      where("email", "==", lowerEmail),
    );
    const guestSnap = await getDocs(guestQuery);

    if (guestSnap.empty) {
      return { success: false, message: "Not on the guest list" };
    }

    const guestDoc = guestSnap.docs[0];
    const guestData = guestDoc.data() as GuestListItem;

    // Step 2: Check if already registered
    if (guestData.status === "registered") {
      return {
        success: true,
        message: "Already registered",
        qrToken: guestData.qrToken || undefined,
      };
    }

    // Step 3: Generate QR token
    const qrToken = generateToken();

    // Step 4: Create or verify Firebase auth user
    const currentUser = auth.currentUser;
    const alreadyAuthenticated =
      currentUser && currentUser.email?.toLowerCase() === lowerEmail;

    if (!alreadyAuthenticated) {
      // Only create auth account if user is not already signed in
      if (!password || password.length < 6) {
        return {
          success: false,
          message: "Password must be at least 6 characters",
        };
      }
      try {
        await createUserWithEmailAndPassword(auth, lowerEmail, password);
      } catch (authError: any) {
        // If user already exists, try signing them in
        if (authError.code === "auth/email-already-in-use") {
          try {
            await signInWithEmailAndPassword(auth, lowerEmail, password);
          } catch {
            return {
              success: false,
              message:
                "Account exists but password is incorrect. Please use the correct password or reset it.",
            };
          }
        } else {
          throw authError;
        }
      }
    }

    // Step 5: Perform batch write for Firestore
    const batch = writeBatch(db);

    // Update guestList doc
    batch.update(doc(db, "guestList", guestDoc.id), {
      status: "registered",
      registeredAt: Timestamp.now(),
      qrToken: qrToken,
    });

    // Create candidates doc with enrollmentType
    batch.set(doc(db, "candidates", guestDoc.id), {
      name: trimmedName,
      email: lowerEmail,
      role: "attendee",
      department: deptToStore,
      qrToken: qrToken,
      fcmToken: fcmToken,
      enrollmentType: guestData.enrollmentType,
      registeredAt: Timestamp.now(),
    });

    await batch.commit();

    return { success: true, message: "Registration successful", qrToken };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: "Registration failed. Please try again.",
    };
  }
}

/**
 * Login guest by email only (no auth). Ensures QR token exists.
 */
export async function loginGuestByEmail(
  inputEmail: string,
): Promise<GuestLoginResult> {
  const lowerEmail = inputEmail.toLowerCase().trim();

  try {
    const guestQuery = query(
      collection(db, "guestList"),
      where("email", "==", lowerEmail),
    );
    const guestSnap = await getDocs(guestQuery);

    if (guestSnap.empty) {
      return { success: false, message: "Not on the guest list" };
    }

    const guestDoc = guestSnap.docs[0];
    const guestData = guestDoc.data() as GuestListItem;

    if (guestData.status === "registered" && guestData.qrToken) {
      return { success: true, qrToken: guestData.qrToken };
    }

    const qrToken = guestData.qrToken || generateToken();
    const batch = writeBatch(db);

    batch.update(doc(db, "guestList", guestDoc.id), {
      status: "registered",
      registeredAt: Timestamp.now(),
      qrToken,
    });

    batch.set(doc(db, "candidates", guestDoc.id), {
      name: guestData.name,
      email: lowerEmail,
      role: "attendee",
      department: "",
      qrToken,
      fcmToken: "guest-login",
      enrollmentType: guestData.enrollmentType,
      registeredAt: Timestamp.now(),
    });

    await batch.commit();
    return { success: true, qrToken };
  } catch (error) {
    console.error("Guest login error:", error);
    return { success: false, message: "Login failed. Please try again." };
  }
}

// ============== QR CHECK-IN LOGIC ==============
export interface CheckInResult {
  success: boolean;
  message: string;
  candidate?: Candidate;
}

/**
 * Validates QR code and records check-in
 */
export async function validateAndCheckIn(
  qrToken: string,
  eventId: string,
  adminUid: string,
): Promise<CheckInResult> {
  try {
    // Step 1: Find candidate by QR token
    const candidateQuery = query(
      collection(db, "candidates"),
      where("qrToken", "==", qrToken),
    );
    const candidateSnap = await getDocs(candidateQuery);

    if (candidateSnap.empty) {
      return { success: false, message: "Invalid QR code" };
    }

    const candidateDoc = candidateSnap.docs[0];
    const candidateData = candidateDoc.data() as Candidate;

    // Step 2: Check if already checked in for this event
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("candidateId", "==", candidateDoc.id),
      where("eventId", "==", eventId),
    );
    const attendanceSnap = await getDocs(attendanceQuery);

    if (!attendanceSnap.empty) {
      return { success: false, message: "Already checked in for this event" };
    }

    // Step 3: Write attendance record
    const attendanceRef = doc(collection(db, "attendance"));
    await setDoc(attendanceRef, {
      candidateId: candidateDoc.id,
      eventId: eventId,
      scannedAt: Timestamp.now(),
      scannedBy: adminUid,
    });

    return {
      success: true,
      message: `Check-in successful for ${candidateData.name}`,
      candidate: { ...candidateData, id: candidateDoc.id },
    };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, message: "Check-in failed. Please try again." };
  }
}

/**
 * Check if attendee has already checked in (for any event or specific event)
 */
export interface CheckInStatusResult {
  hasCheckedIn: boolean;
  checkedInAt?: Timestamp;
  candidateName?: string;
  candidateEmail?: string;
}

/**
 * Subscribe to check-in status updates
 */
export function subscribeToCheckInStatus(
  qrToken: string,
  callback: (status: CheckInStatusResult) => void,
): () => void {
  let unsubscribeAttendance: (() => void) | null = null;

  const findCandidateAndListen = async () => {
    try {
      const candidateQuery = query(
        collection(db, "candidates"),
        where("qrToken", "==", qrToken),
      );
      const candidateSnap = await getDocs(candidateQuery);

      if (candidateSnap.empty) {
        callback({ hasCheckedIn: false });
        return;
      }

      const candidateDoc = candidateSnap.docs[0];
      const candidateData = candidateDoc.data() as Candidate;

      const attendanceQuery = query(
        collection(db, "attendance"),
        where("candidateId", "==", candidateDoc.id),
      );

      unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0].data();
          callback({
            hasCheckedIn: true,
            checkedInAt: doc.scannedAt,
            candidateName: candidateData.name,
            candidateEmail: candidateData.email,
          });
        } else {
          callback({ hasCheckedIn: false });
        }
      });
    } catch (error) {
      console.error("Error in subscribeToCheckInStatus:", error);
      callback({ hasCheckedIn: false });
    }
  };

  findCandidateAndListen();

  return () => {
    if (unsubscribeAttendance) unsubscribeAttendance();
  };
}

export async function getCheckInStatus(
  qrToken: string,
  eventId?: string,
): Promise<CheckInStatusResult> {
  try {
    // Step 1: Find candidate by QR token
    const candidateQuery = query(
      collection(db, "candidates"),
      where("qrToken", "==", qrToken),
    );
    const candidateSnap = await getDocs(candidateQuery);

    if (candidateSnap.empty) {
      return { hasCheckedIn: false };
    }

    const candidateDoc = candidateSnap.docs[0];
    const candidateData = candidateDoc.data() as Candidate;

    // Step 2: Check if already checked in
    // If eventId provided, check for that specific event
    // Otherwise, check if checked in for ANY event
    let attendanceQuery;

    if (eventId) {
      attendanceQuery = query(
        collection(db, "attendance"),
        where("candidateId", "==", candidateDoc.id),
        where("eventId", "==", eventId),
      );
    } else {
      // Check if already checked in for any event
      attendanceQuery = query(
        collection(db, "attendance"),
        where("candidateId", "==", candidateDoc.id),
      );
    }

    const attendanceSnap = await getDocs(attendanceQuery);

    if (!attendanceSnap.empty) {
      const attendanceData = attendanceSnap.docs[0].data() as AttendanceRecord;
      return {
        hasCheckedIn: true,
        checkedInAt: attendanceData.scannedAt,
        candidateName: candidateData.name,
        candidateEmail: candidateData.email,
      };
    }

    return {
      hasCheckedIn: false,
      candidateName: candidateData.name,
      candidateEmail: candidateData.email,
    };
  } catch (error) {
    console.error("Check-in status error:", error);
    return { hasCheckedIn: false };
  }
}

// ============== QUERY HELPERS ==============

/**
 * Get all events
 */
export async function getEvents(): Promise<EventData[]> {
  try {
    const snapshot = await getDocs(collection(db, "agenda"));
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as EventData,
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

/**
 * Get masterclass agenda
 */
export async function getMasterclassAgenda(): Promise<EventData | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "agenda"), where("type", "==", "masterclass")),
    );

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as EventData;
  } catch (error) {
    console.error("Error fetching masterclass agenda:", error);
    return null;
  }
}

/**
 * Get event agenda
 */
export async function getEventAgenda(): Promise<EventData | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "agenda"), where("type", "==", "event")),
    );

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as EventData;
  } catch (error) {
    console.error("Error fetching event agenda:", error);
    return null;
  }
}

/**
 * Get all agendas (masterclass + event) for admin management
 */
export async function getAllAgendas(): Promise<
  (EventData & { type: string })[]
> {
  try {
    const snapshot = await getDocs(collection(db, "agenda"));
    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as EventData & { type: string },
    );
  } catch (error) {
    console.error("Error fetching all agendas:", error);
    return [];
  }
}

/**
 * Save (create or update) an agenda for masterclass or event
 */
export async function saveAgenda(
  type: "masterclass" | "event",
  title: string,
  date: Date,
  agendaItems: {
    time: string;
    title: string;
    speaker: string;
    tag: string;
  }[],
): Promise<{ success: boolean; message: string }> {
  try {
    // Find existing agenda document of this type
    const existingQuery = query(
      collection(db, "agenda"),
      where("type", "==", type),
    );
    const existingSnap = await getDocs(existingQuery);

    const data = {
      type,
      title: title.trim(),
      date: Timestamp.fromDate(date),
      agenda: agendaItems,
    };

    if (!existingSnap.empty) {
      // Update existing
      const docId = existingSnap.docs[0].id;
      await setDoc(doc(db, "agenda", docId), data, { merge: true });
    } else {
      // Create new
      await addDoc(collection(db, "agenda"), data);
    }

    return { success: true, message: "Agenda saved successfully" };
  } catch (error) {
    console.error("Error saving agenda:", error);
    return { success: false, message: "Failed to save agenda" };
  }
}

/**
 * Delete an entire agenda document by type (masterclass or event)
 */
export async function deleteAgenda(
  type: "masterclass" | "event",
): Promise<{ success: boolean; message: string }> {
  try {
    const existingQuery = query(
      collection(db, "agenda"),
      where("type", "==", type),
    );
    const existingSnap = await getDocs(existingQuery);

    if (existingSnap.empty) {
      return { success: false, message: `No ${type} agenda found to delete` };
    }

    const docId = existingSnap.docs[0].id;
    await deleteDoc(doc(db, "agenda", docId));
    return {
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} agenda deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting agenda:", error);
    return { success: false, message: "Failed to delete agenda" };
  }
}

/**
 * Get candidate by QR token
 */
export async function getCandidateByQRToken(
  qrToken: string,
): Promise<Candidate | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "candidates"), where("qrToken", "==", qrToken)),
    );

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Candidate;
  } catch (error) {
    console.error("Error fetching candidate by QR token:", error);
    return null;
  }
}

/**
 * Get guest list item by QR token
 */
export async function getGuestByQRToken(
  qrToken: string,
): Promise<GuestListItem | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "guestList"), where("qrToken", "==", qrToken)),
    );

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as GuestListItem;
  } catch (error) {
    console.error("Error fetching guest by QR token:", error);
    return null;
  }
}

/**
 * Get total candidate count by enrollment type
 */
export async function getCandidateCountByType(
  type: "masterclass" | "event",
): Promise<number> {
  try {
    const q = query(
      collection(db, "candidates"),
      where("enrollmentType", "==", type),
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting candidate count:", error);
    return 0;
  }
}

/**
 * Subscribe to candidate count by type
 */
export function subscribeToCandidateCount(
  type: "masterclass" | "event",
  callback: (count: number) => void,
): () => void {
  const q = query(
    collection(db, "candidates"),
    where("enrollmentType", "==", type),
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Get candidate by email (used after login to retrieve QR token)
 */
export async function getCandidateByEmail(
  email: string,
): Promise<Candidate | null> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "candidates"),
        where("email", "==", email.toLowerCase().trim()),
      ),
    );

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Candidate;
  } catch (error) {
    console.error("Error fetching candidate by email:", error);
    return null;
  }
}

/**
 * Subscribe to real-time attendance count
 */
export function subscribeToAttendanceCount(
  eventId: string,
  callback: (count: number) => void,
): () => void {
  const q = query(
    collection(db, "attendance"),
    where("eventId", "==", eventId),
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Subscribe to check-in log for admin panel
 */
export function subscribeToCheckInLog(
  arg1: string | ((records: AttendanceRecord[]) => void),
  arg2?: (records: AttendanceRecord[]) => void,
): () => void {
  let callback: (records: AttendanceRecord[]) => void;
  let eventId: string | undefined;

  if (typeof arg1 === "function") {
    callback = arg1;
    eventId = undefined;
  } else {
    eventId = arg1;
    callback = arg2!;
  }

  const attendanceRef = collection(db, "attendance");
  let q = query(attendanceRef, orderBy("scannedAt", "desc"));

  if (eventId) {
    q = query(
      attendanceRef,
      where("eventId", "==", eventId),
      orderBy("scannedAt", "desc"),
    );
  }

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as AttendanceRecord,
    );
    callback(records);
  });
}

/**
 * Get candidate info by ID
 */
export async function getCandidateById(
  candidateId: string,
): Promise<Candidate | null> {
  try {
    const docSnap = await getDoc(doc(db, "candidates", candidateId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Candidate;
    }
    return null;
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return null;
  }
}

/**
 * Get guest list items
 */
export async function getGuestList(): Promise<GuestListItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "guestList"));
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as GuestListItem,
    );
  } catch (error) {
    console.error("Error fetching guest list:", error);
    return [];
  }
}

/**
 * Get all attendees (registered candidates)
 */
export async function getAttendeeList(): Promise<Candidate[]> {
  try {
    const attendeeQuery = query(
      collection(db, "candidates"),
      where("role", "==", "attendee"),
    );
    const snapshot = await getDocs(attendeeQuery);
    const attendees = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Candidate,
    );
    return attendees.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching attendee list:", error);
    return [];
  }
}

/**
 * Get candidate IDs that have checked in (optionally for a specific event)
 */
export async function getCheckedInCandidateIds(
  eventId?: string,
): Promise<string[]> {
  try {
    const attendanceQuery = eventId
      ? query(collection(db, "attendance"), where("eventId", "==", eventId))
      : query(collection(db, "attendance"));
    const snapshot = await getDocs(attendanceQuery);
    return snapshot.docs
      .map((doc) => (doc.data() as AttendanceRecord).candidateId)
      .filter(Boolean);
  } catch (error) {
    console.error("Error fetching check-in list:", error);
    return [];
  }
}

/**
 * Add guest to guest list (Enhanced with duplicate checking)
 */
export async function addGuest(
  name: string,
  email: string,
  enrollmentType: "masterclass" | "event",
): Promise<{ success: boolean; message: string }> {
  try {
    const lowerEmail = email.toLowerCase().trim();

    // Check if guest already exists
    const guestQuery = query(
      collection(db, "guestList"),
      where("email", "==", lowerEmail),
    );
    const existingGuest = await getDocs(guestQuery);

    if (!existingGuest.empty) {
      return {
        success: false,
        message: `Guest with email ${lowerEmail} already exists`,
      };
    }

    // Add new guest
    const docRef = doc(collection(db, "guestList"));
    await setDoc(docRef, {
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      email: lowerEmail,
      enrollmentType, // Already in lowercase
      status: "pending",
      registeredAt: null,
      qrToken: null,
    });

    return { success: true, message: "Guest added successfully" };
  } catch (error) {
    console.error("Error adding guest:", error);
    return { success: false, message: "Failed to add guest" };
  }
}

/**
 * Batch add guests from CSV (Enhanced with validation and duplicate checking)
 */
export async function addGuestsFromCSV(
  guests: {
    name: string;
    email: string;
    enrollmentType: "masterclass" | "event";
  }[],
): Promise<{
  success: boolean;
  added: number;
  failed: number;
  message: string;
  failures?: { name: string; email: string; error: string }[];
}> {
  try {
    const batch = writeBatch(db);
    let added = 0;
    let failed = 0;
    const failures: { name: string; email: string; error: string }[] = [];

    // First, check for duplicates in the database
    for (const guest of guests) {
      try {
        const lowerEmail = guest.email.toLowerCase().trim();

        // Check if guest already exists in database
        const guestQuery = query(
          collection(db, "guestList"),
          where("email", "==", lowerEmail),
        );
        const existingGuest = await getDocs(guestQuery);

        if (!existingGuest.empty) {
          failed++;
          failures.push({
            name: guest.name,
            email: lowerEmail,
            error: "Email already exists in database",
          });
          continue;
        }

        // Add to batch
        const docRef = doc(collection(db, "guestList"));
        batch.set(docRef, {
          name: guest.name.trim(),
          nameLower: guest.name.trim().toLowerCase(),
          email: lowerEmail,
          enrollmentType: guest.enrollmentType, // Already in lowercase
          status: "pending",
          registeredAt: null,
          qrToken: null,
        });
        added++;
      } catch (error) {
        console.error("Error processing guest:", guest, error);
        failed++;
        failures.push({
          name: guest.name,
          email: guest.email,
          error: "Failed to process guest",
        });
      }
    }

    // Commit the batch if there are any guests to add
    if (added > 0) {
      await batch.commit();
    }

    const failureMessage = failed > 0 ? `, ${failed} failed` : "";
    return {
      success: failed === 0,
      added,
      failed,
      message: `Added ${added} guests${failureMessage}`,
      failures: failures.length > 0 ? failures : undefined,
    };
  } catch (error) {
    console.error("Error batch adding guests:", error);
    return {
      success: false,
      added: 0,
      failed: guests.length,
      message: "Batch upload failed",
      failures: [
        {
          name: "Batch Error",
          email: "",
          error: "Batch upload failed due to database error",
        },
      ],
    };
  }
}

/**
 * Check if an email exists in the guest list (for real-time validation)
 */
export async function checkIfEmailInGuestList(
  inputEmail: string,
): Promise<{ exists: boolean; guestName?: string }> {
  try {
    const lowerEmail = inputEmail.toLowerCase().trim();
    const guestQuery = query(
      collection(db, "guestList"),
      where("email", "==", lowerEmail),
    );
    const guestSnap = await getDocs(guestQuery);

    if (guestSnap.empty) {
      return { exists: false };
    }

    const guestData = guestSnap.docs[0].data() as GuestListItem;
    return { exists: true, guestName: guestData.name };
  } catch (error) {
    console.error("Error checking email in guest list:", error);
    return { exists: false };
  }
}

/**
 * Delete a guest from guest list (for admin management)
 */
export async function deleteGuest(
  guestId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, "guestList", guestId));
    return { success: true, message: "Guest deleted successfully" };
  } catch (error) {
    console.error("Error deleting guest:", error);
    return { success: false, message: "Failed to delete guest" };
  }
}

/**
 * Update guest information
 */
export async function updateGuest(
  guestId: string,
  updates: Partial<{
    name: string;
    email: string;
    enrollmentType: "masterclass" | "event";
  }>,
): Promise<{ success: boolean; message: string }> {
  try {
    const guestRef = doc(db, "guestList", guestId);
    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name.trim();
      updateData.nameLower = updates.name.trim().toLowerCase();
    }
    if (updates.email) {
      updateData.email = updates.email.toLowerCase().trim();
    }
    if (updates.enrollmentType) {
      updateData.enrollmentType = updates.enrollmentType;
    }

    await setDoc(guestRef, updateData, { merge: true });
    return { success: true, message: "Guest updated successfully" };
  } catch (error) {
    console.error("Error updating guest:", error);
    return { success: false, message: "Failed to update guest" };
  }
}

/**
 * Get guest statistics by enrollment type
 */
export async function getGuestStatistics(): Promise<{
  total: number;
  masterclass: number;
  event: number;
  registered: number;
  pending: number;
}> {
  try {
    const snapshot = await getDocs(collection(db, "guestList"));
    const guests = snapshot.docs.map((doc) => doc.data() as GuestListItem);

    return {
      total: guests.length,
      masterclass: guests.filter((g) => g.enrollmentType === "masterclass")
        .length,
      event: guests.filter((g) => g.enrollmentType === "event").length,
      registered: guests.filter((g) => g.status === "registered").length,
      pending: guests.filter((g) => g.status === "pending").length,
    };
  } catch (error) {
    console.error("Error getting guest statistics:", error);
    return {
      total: 0,
      masterclass: 0,
      event: 0,
      registered: 0,
      pending: 0,
    };
  }
}
