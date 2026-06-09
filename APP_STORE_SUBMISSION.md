# ConnectHQ — App Store Submission Guide

To ensure a smooth and successful approval process for ConnectHQ, follow the guidelines below. This document provides copy-pasteable notes for App Store Connect, backend test configuration instructions, and App Privacy disclosures.

---

## 1. App Review Notes (Copy & Paste)

Copy the text below and paste it into the **App Review Notes** (in the *App Info* -> *Version Information* section) in App Store Connect.

```text
============================================================
CONNECTHQ TESTING AND CREDENTIAL DETAILS
============================================================

Thank you for reviewing ConnectHQ. This application is an event utility used by attendees to access their event passes, view schedules, and check in via QR code scanning. The app supports two modes: Guest/Attendee and Organizer/Admin.

To fully test the core features (viewing agendas, accessing QR passes, and scanning passes), we have configured active test credentials and pre-loaded test data in our Firebase backend.

------------------------------------------------------------
TEST ACCOUNT 1: Organizer (Admin Role)
------------------------------------------------------------
Use these credentials under the "Organizer" tab on the login screen.
* Role: Organizer/Admin (Requires Camera access for scanning)
* Email/Username: superadmin@test.com
* Password: 12345678

Testing steps for Organizer:
1. Open the app and navigate to the "Organizer" tab on the Login Screen.
2. Enter the credentials above.
3. Access the Scan interface and grant camera permissions. You can scan the Attendee QR code (provided below) to test real-time check-in.

------------------------------------------------------------
TEST ACCOUNT 2: Guest / Attendee
------------------------------------------------------------
Use these credentials under the "Guest" tab on the login screen.
* Role: Attendee (Pass holder)
* Name: Ajay
* Email: ajay@gmail.com

Testing steps for Attendee:
1. Open the app and navigate to the "Guest" tab on the Login Screen.
2. Enter the name and email address above.
3. Accept Terms and click "Continue to Event."
4. View the generated QR Event Pass, view the Event Agenda, and check the Profile page (which includes the in-app Account Deletion flow).

------------------------------------------------------------
MOCK QR CODE FOR TESTING CHECK-IN
------------------------------------------------------------
To test the Organizer's scanning capability, please generate a QR code containing the following exact text token:
* QR Code Token Value: TEST-QR-TOKEN-12345

Scanning this token using the Organizer login will trigger a successful check-in alert.

If you have any questions or require additional details, please contact us at synergysphere@gryphonacademy.co.in.
```

---

## 2. Mock Test Event Setup (Firebase Console)

To ensure the review credentials work immediately, you must verify or create the following document entries in your Firebase Firestore Database:

### A. Agenda (The Mock Event)
Add a document in the `agenda` collection:
* **Collection:** `agenda`
* **Document ID:** `test_event_agenda` (or auto-ID)
* **Fields:**
  - `type`: `event` (String)
  - `title`: `ConnectHQ Tech Summit 2026` (String)
  - `date`: Current date/time (Timestamp)
  - `agenda`: (Array of Maps)
    - Item 0: `{ time: "09:00 AM", title: "Registration & Welcome", speaker: "ConnectHQ Team", tag: "General" }`
    - Item 1: `{ time: "10:00 AM", title: "The Future of Event Tech", speaker: "Jane Doe", tag: "Keynote" }`

### B. Guest List
Add a document in the `guestList` collection to allow the guest to sign in:
* **Collection:** `guestList`
* **Document ID:** `test_guest_doc` (or auto-ID)
* **Fields:**
  - `name`: `Ajay` (String)
  - `nameLower`: `ajay` (String)
  - `email`: `ajay@gmail.com` (String)
  - `status`: `pending` (String)
  - `registeredAt`: `null` (Null)
  - `qrToken`: `TEST-QR-TOKEN-12345` (String)
  - `enrollmentType`: `event` (String)

### C. Admin User (For Firebase Authentication)
Ensure the organizer login exists in Firebase Authentication and Firestore:
1. In **Firebase Auth Console**, click **Add User**:
   - **Email:** `superadmin@test.com`
   - **Password:** `12345678`
2. Note the generated User ID (`UID`) from Firebase Auth.
3. In **Firestore Database**, create a document in the `users` collection:
   - **Collection:** `users`
   - **Document ID:** `[Use the Auth UID generated above]`
   - **Fields:**
     - `name`: `System Administrator` (String)
     - `email`: `superadmin@test.com` (String)
     - `role`: `admin` (String)

---

## 3. Step-by-Step Tester Walkthrough

When Apple performs the review, they will follow these exact actions. Perform these steps yourself to verify everything is working flawlessly:

1. **Guest Access:**
   - Launch ConnectHQ.
   - Select the **Guest** tab.
   - Enter `Ajay` and `ajay@gmail.com`.
   - Accept the Terms and Conditions and press **Continue to Event**.
   - **Verify:** The app successfully fetches the `TEST-QR-TOKEN-12345` and renders a clean, scannable QR Code pass on the `QR Pass` screen.
   - Navigate to the `Agenda` screen.
   - **Verify:** The `ConnectHQ Tech Summit 2026` mock agenda items load and render.

2. **In-App Account Deletion:**
   - On the Attendee dashboard, navigate to the **Profile** screen.
   - Click **Delete Account** at the bottom.
   - **Verify:** The app navigates to the internal `Delete Account` screen instead of opening an external browser link.
   - Type `ajay@gmail.com` to confirm and click **Permanently Delete My Account**.
   - **Verify:** Confirming the deletion clears the local AsyncStorage, triggers Firestore cleanup, and returns you to the login screen.

3. **Organizer / Admin Scanning:**
   - Re-open the app and select the **Organizer** tab.
   - Enter `superadmin@test.com` and `12345678` and log in.
   - Navigate to the **Scan** tab.
   - Accept the camera permission request.
   - **Verify:** The camera view opens. Scan a generated QR code containing `TEST-QR-TOKEN-12345`.
   - **Verify:** A clear success notification/haptic response is triggered.

---

## 4. App Privacy Questionnaire Disclosures

Under Apple Guideline 5.1.1, you must disclose the exact data collected by the app. When completing the **App Privacy** questionnaire in App Store Connect, select the following options:

* **Identifiers:**
  - *Data Type:* **Name** and **Email Address**.
  - *Usage:* **App Functionality** (used for registration, logging in, generating passes).
  - *Linked to User:* **Yes** (linked to user account).
  - *Tracking:* **No** (never used to track users across third-party apps or websites).

* **Device Diagnostics:**
  - *Data Type:* **Device ID** or diagnostics (e.g. Firebase Crashlytics if configured).
  - *Usage:* **App Functionality** and **Analytics**.
  - *Linked to User:* **No**.
  - *Tracking:* **No**.

* **User Content:**
  - *Data Type:* **Profile Info** (e.g. name, company name).
  - *Usage:* **App Functionality**.
  - *Linked to User:* **Yes**.
  - *Tracking:* **No**.
