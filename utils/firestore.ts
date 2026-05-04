import { db, auth } from '@/config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
// Custom random token generator for Expo compatibility (avoids crypto error)
const generateToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// ============== TYPE DEFINITIONS ==============
export interface GuestListItem {
  id: string;
  name: string;
  nameLower: string;
  email: string;
  status: 'pending' | 'registered';
  registeredAt: Timestamp | null;
  qrToken: string | null;
  enrollmentType: 'masterclass' | 'event';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: 'attendee' | 'speaker' | 'volunteer';
  department: string;
  qrToken: string;
  fcmToken: string;
  registeredAt: Timestamp;
  enrollmentType: 'masterclass' | 'event';
}

export interface EventData {
  id: string;
  title: string;
  date: Timestamp;
  agenda: Array<{
    time: string;
    title: string;
    speaker: string;
    tag: string;
  }>;
}

export interface AttendanceRecord {
  id: string;
  candidateId: string;
  eventId: string;
  scannedAt: Timestamp;
  scannedBy: string;
}

// ============== REGISTRATION LOGIC ==============
export interface RegistrationResult {
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
  department: string = ''
): Promise<RegistrationResult> {
  const trimmedName = inputName.trim();
  const lowerEmail = inputEmail.toLowerCase().trim();
  const deptToStore = department.trim();

  try {
    // Step 1: Query guestList by email
    const guestQuery = query(
      collection(db, 'guestList'),
      where('email', '==', lowerEmail)
    );
    const guestSnap = await getDocs(guestQuery);

    if (guestSnap.empty) {
      return { success: false, message: 'Not on the guest list' };
    }

    const guestDoc = guestSnap.docs[0];
    const guestData = guestDoc.data() as GuestListItem;

    // Step 2: Check if already registered
    if (guestData.status === 'registered') {
      return {
        success: true,
        message: 'Already registered',
        qrToken: guestData.qrToken || undefined,
      };
    }

    // Step 3: Generate QR token
    const qrToken = generateToken();

    // Step 4: Create Firebase auth user with provided password
    try {
      await createUserWithEmailAndPassword(auth, lowerEmail, password);
    } catch (authError: any) {
      // If user already exists, just sign them in
      if (authError.code === 'auth/email-already-in-use') {
        await signInWithEmailAndPassword(auth, lowerEmail, password);
      } else {
        throw authError;
      }
    }

    // Step 5: Perform batch write for Firestore
    const batch = writeBatch(db);

    // Update guestList doc
    batch.update(doc(db, 'guestList', guestDoc.id), {
      status: 'registered',
      registeredAt: Timestamp.now(),
      qrToken: qrToken,
    });

    // Create candidates doc with enrollmentType
    batch.set(doc(db, 'candidates', guestDoc.id), {
      name: trimmedName,
      email: lowerEmail,
      role: 'attendee',
      department: deptToStore,
      qrToken: qrToken,
      fcmToken: fcmToken,
      enrollmentType: guestData.enrollmentType,
      registeredAt: Timestamp.now(),
    });

    await batch.commit();

    return { success: true, message: 'Registration successful', qrToken };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Registration failed. Please try again.' };
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
  adminUid: string
): Promise<CheckInResult> {
  try {
    // Step 1: Find candidate by QR token
    const candidateQuery = query(
      collection(db, 'candidates'),
      where('qrToken', '==', qrToken)
    );
    const candidateSnap = await getDocs(candidateQuery);

    if (candidateSnap.empty) {
      return { success: false, message: 'Invalid QR code' };
    }

    const candidateDoc = candidateSnap.docs[0];
    const candidateData = candidateDoc.data() as Candidate;

    // Step 2: Check if already checked in for this event
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('candidateId', '==', candidateDoc.id),
      where('eventId', '==', eventId)
    );
    const attendanceSnap = await getDocs(attendanceQuery);

    if (!attendanceSnap.empty) {
      return { success: false, message: 'Already checked in for this event' };
    }

    // Step 3: Write attendance record
    const attendanceRef = doc(collection(db, 'attendance'));
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
    console.error('Check-in error:', error);
    return { success: false, message: 'Check-in failed. Please try again.' };
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

export async function getCheckInStatus(
  qrToken: string,
  eventId?: string
): Promise<CheckInStatusResult> {
  try {
    // Step 1: Find candidate by QR token
    const candidateQuery = query(
      collection(db, 'candidates'),
      where('qrToken', '==', qrToken)
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
        collection(db, 'attendance'),
        where('candidateId', '==', candidateDoc.id),
        where('eventId', '==', eventId)
      );
    } else {
      // Check if already checked in for any event
      attendanceQuery = query(
        collection(db, 'attendance'),
        where('candidateId', '==', candidateDoc.id)
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
    console.error('Check-in status error:', error);
    return { hasCheckedIn: false };
  }
}

// ============== QUERY HELPERS ==============

/**
 * Get all events
 */
export async function getEvents(): Promise<EventData[]> {
  try {
    const snapshot = await getDocs(collection(db, 'events'));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as EventData));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Get masterclass agenda
 */
export async function getMasterclassAgenda(): Promise<EventData | null> {
  try {
    const snapshot = await getDocs(query(
      collection(db, 'agenda'),
      where('type', '==', 'masterclass')
    ));
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as EventData;
  } catch (error) {
    console.error('Error fetching masterclass agenda:', error);
    return null;
  }
}

/**
 * Get event agenda
 */
export async function getEventAgenda(): Promise<EventData | null> {
  try {
    const snapshot = await getDocs(query(
      collection(db, 'agenda'),
      where('type', '==', 'event')
    ));
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as EventData;
  } catch (error) {
    console.error('Error fetching event agenda:', error);
    return null;
  }
}

/**
 * Get candidate by QR token
 */
export async function getCandidateByQRToken(qrToken: string): Promise<Candidate | null> {
  try {
    const snapshot = await getDocs(query(
      collection(db, 'candidates'),
      where('qrToken', '==', qrToken)
    ));
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Candidate;
  } catch (error) {
    console.error('Error fetching candidate by QR token:', error);
    return null;
  }
}

/**
 * Subscribe to real-time attendance count
 */
export function subscribeToAttendanceCount(
  eventId: string,
  callback: (count: number) => void
): () => void {
  const q = query(
    collection(db, 'attendance'),
    where('eventId', '==', eventId)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Subscribe to check-in log for admin panel
 */
export function subscribeToCheckInLog(
  eventId: string,
  callback: (records: AttendanceRecord[]) => void
): () => void {
  const q = query(
    collection(db, 'attendance'),
    where('eventId', '==', eventId),
    orderBy('scannedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as AttendanceRecord));
    callback(records);
  });
}

/**
 * Get candidate info by ID
 */
export async function getCandidateById(candidateId: string): Promise<Candidate | null> {
  try {
    const docSnap = await getDoc(doc(db, 'candidates', candidateId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Candidate;
    }
    return null;
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return null;
  }
}

/**
 * Get guest list items
 */
export async function getGuestList(): Promise<GuestListItem[]> {
  try {
    const snapshot = await getDocs(collection(db, 'guestList'));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as GuestListItem));
  } catch (error) {
    console.error('Error fetching guest list:', error);
    return [];
  }
}

/**
 * Add guest to guest list
 */
export async function addGuest(
  name: string,
  email: string,
  enrollmentType: 'masterclass' | 'event'
): Promise<{ success: boolean; message: string }> {
  try {
    const docRef = doc(collection(db, 'guestList'));
    await setDoc(docRef, {
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      email: email.toLowerCase().trim(),
      enrollmentType,
      status: 'pending',
      registeredAt: null,
      qrToken: null,
    });
    return { success: true, message: 'Guest added successfully' };
  } catch (error) {
    console.error('Error adding guest:', error);
    return { success: false, message: 'Failed to add guest' };
  }
}

/**
 * Batch add guests from CSV
 */
export async function addGuestsFromCSV(
  guests: Array<{ name: string; email: string; enrollmentType: 'masterclass' | 'event' }>
): Promise<{ success: boolean; added: number; failed: number; message: string }> {
  try {
    const batch = writeBatch(db);
    let added = 0;
    let failed = 0;

    for (const guest of guests) {
      try {
        const docRef = doc(collection(db, 'guestList'));
        batch.set(docRef, {
          name: guest.name.trim(),
          nameLower: guest.name.trim().toLowerCase(),
          email: guest.email.toLowerCase().trim(),
          enrollmentType: guest.enrollmentType,
          status: 'pending',
          registeredAt: null,
          qrToken: null,
        });
        added++;
      } catch (error) {
        console.error('Error adding guest:', guest, error);
        failed++;
      }
    }

    await batch.commit();
    const failureMessage = failed > 0 ? `, ${failed} failed` : '';
    return {
      success: failed === 0,
      added,
      failed,
      message: `Added ${added} guests${failureMessage}`,
    };
  } catch (error) {
    console.error('Error batch adding guests:', error);
    return {
      success: false,
      added: 0,
      failed: guests.length,
      message: 'Batch upload failed',
    };
  }
}

/**
 * Check if an email exists in the guest list (for real-time validation)
 */
export async function checkIfEmailInGuestList(
  inputEmail: string
): Promise<{ exists: boolean; guestName?: string }> {
  try {
    const lowerEmail = inputEmail.toLowerCase().trim();
    const guestQuery = query(
      collection(db, 'guestList'),
      where('email', '==', lowerEmail)
    );
    const guestSnap = await getDocs(guestQuery);

    if (guestSnap.empty) {
      return { exists: false };
    }

    const guestData = guestSnap.docs[0].data() as GuestListItem;
    return { exists: true, guestName: guestData.name };
  } catch (error) {
    console.error('Error checking email in guest list:', error);
    return { exists: false };
  }
}
