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

---

## 5. Updating App Store Screenshots (Active Apps)

When an app is in the **Ready for Distribution** (or live) status on App Store Connect, you cannot edit or replace screenshots directly for that version. You have two ways to update the screenshots shown on the App Store:

### Method A: Creating a New App Version (Standard Way)
This is the recommended and most common method if you are also releasing minor fixes or updating build versions.

1. **Log in to App Store Connect** ([appstoreconnect.apple.com](https://appstoreconnect.apple.com/apps)).
2. Select **ConnectHQ EventPass**.
3. In the left sidebar, click the **`+`** icon next to **iOS App** to create a new version.
4. Enter the new version number (e.g., `1.0.1` or `1.1.0`) and click **Create**.
5. Select the newly created version under **iOS App** in the left sidebar (it will show `Prepare for Submission`).
6. Scroll down to the **App Video Previews and Screenshots** section.
7. Click the tab for the appropriate display sizes (e.g., **iPhone 6.7" Display**, **iPhone 6.5" Display**, and **iPhone 5.5" Display**).
8. Hover over the old screenshots and click the **Delete (Trash)** icon, then drag and drop your new screenshots into the empty slots.
9. **Update build numbers in local codebase** (if needed, increment `version` and `buildNumber` in `app.json`, rebuild using `eas build -p ios`, and upload).
10. Select the new build in the **Build** section of App Store Connect.
11. Click **Save** in the top right, then click **Add for Review** or **Submit for Review**.
12. Once approved by Apple, the new screenshots will go live.

### Method B: Using Product Page Optimization (No Code Release Required)
This is a powerful workaround if you only want to change the screenshots without rebuilding the app or submitting a new binary code version.

1. **Log in to App Store Connect** and select **ConnectHQ EventPass**.
2. In the left sidebar, under the **Features** section, click on **Product Page Optimization**.
3. Click **Create Test** (or the **`+`** icon).
4. Enter a reference name (e.g., `New Screenshots Update`).
5. Choose **1 Treatment** and set the traffic proportion to **100%** (if you want all users to see the new ones once live) or lower if you want to A/B test first. Click **Create**.
6. On the test setup screen, click on the **Treatment A** tab.
7. Scroll down to **Screenshots**, delete the old screenshots, and upload your new ones.
8. Click **Save**, then click **Submit for Review** in the top right. 
   - *Note: This reviews only the page metadata/screenshots, not the app binary. It is typically approved quickly.*
9. Once approved, go back to **Product Page Optimization**, select the test, and click **Start Test**.
10. To make them permanent: Go to the running test, click **Apply Treatment to Original Product Page**. This will overwrite the live screenshots with the new ones and stop the test.

---

### Local Project Assets (For Reference)
If you also want to update the screenshots kept in the repository/codebase for documentation and marketing purposes, replace the old files in `assets/images/` with your new files using the same names:
- `assets/images/1splashscreen.png`
- `assets/images/2qrpass.png`
- `assets/images/3attendee.png`
- `assets/images/4gallery.png`
- `assets/images/5profile.png`
- `assets/images/6androidpass.png`
- `assets/images/7agenda.png`

---

## 6. Official App Store Description (Gryphon Academy Branding)

Copy and paste one of the options below into the **Description** field of your app on App Store Connect (under the App Information/Version page).

### Option 1: Professional & Educational (Recommended)
```text
ConnectHQ EventPass is the official event companion app developed and powered by Gryphon Academy. Designed specifically for Gryphon Academy’s academic conferences, campus events, seminars, workshops, and professional training sessions, this app brings organizers and attendees together in a seamless, paperless environment.

With ConnectHQ EventPass, managing event access, schedules, and attendance is simpler than ever:

For Attendees:
• Academic & Event Agendas: View detailed schedules, session times, speaker profiles, and tracks for Gryphon Academy events.
• Digital QR Passes: Instantly access your secure, unique QR event pass for rapid entry check-in.
• Profile Management: Maintain your profile details, manage event registrations, and control your account settings directly in the app.

For Organizers:
• Lightning-Fast Check-ins: Scan attendee QR passes using the built-in organizer scanner for instant verification.
• Real-Time Attendance Logs: Monitor attendee check-in counts and live stats on a unified dashboard.
• Seamless Data Management: Sync guest lists, import registrations, and export attendance reports in CSV format.

Built to elevate the educational and professional event experience, ConnectHQ EventPass keeps Gryphon Academy’s events simple, organized, secure, and mobile-first.
```

### Option 2: Brief & Direct (Under 1000 characters)
```text
ConnectHQ EventPass is the official event companion app developed by Gryphon Academy. Built to streamline campus events, seminars, and academic workshops, it serves as an all-in-one check-in and agenda tool for the Gryphon Academy community.

Key Features:
- Attendees: Easily view upcoming event schedules, access personalized digital QR event passes, and manage your attendee profile.
- Organizers: Use QR scanning tools to verify entries, track attendance live, and export check-in data securely.

Powered by Gryphon Academy, ConnectHQ EventPass makes academic and corporate event coordination simple, fast, and mobile-first.
```

---

## 7. What's New in This Version (Release Notes)

Copy and paste the template below into the **What's New in This Version** field when uploading this update to App Store Connect.

```text
- Gryphon Academy Branding: Refreshed store images and official app descriptions.
- Tablet & iPad Support: Optimized dimensions and container sizes to ensure a premium visual layout on iPads.
- Core Stability & Fixes: Resolved minor login redirect behaviors, updated terms/privacy pages, and improved navigation routing on iOS devices.
```



