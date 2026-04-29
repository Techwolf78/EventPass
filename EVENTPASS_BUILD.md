# EventPass - Build Complete ✅

A React Native + Firebase event management app built with Expo, featuring attendee registration, QR code check-in, and admin panels.

---

## 🏗️ Architecture Overview

### Navigation Structure
```
App (Root with Auth Check)
├── No User → (auth) - LoginScreen
├── User + Admin → (admin) - Bottom Tabs
│   ├── scanner - QR Scanner
│   ├── panel - Admin Panel
│   └── guests - Guest List
└── User + Attendee → (attendee) - Stack
    ├── register - Registration
    ├── qr-pass - QR Code Display
    └── agenda - Event Agenda
```

### Firebase Collections Structure
- **guestList/** - Admin-managed invite list (pending → registered)
- **candidates/** - Registered attendees with QR tokens
- **events/** - Event info and agenda
- **attendance/** - Check-in records

---

## 📁 Project Structure

### Core Configuration
- **config/firebase.ts** - Firebase initialization with optional emulator support
- **context/AuthContext.tsx** - Auth state management with admin detection
- **utils/firestore.ts** - All Firestore business logic and helpers

### Navigation Layers

#### Authentication (`app/(auth)/`)
- **login.tsx** - Sign in / Sign up with email/password

#### Admin Flow (`app/(admin)/`)
- **scanner.tsx** - QR code scanner with check-in logic
  - Multi-event support with event selector
  - Real-time check-in validation
  - Visual feedback with success/error alerts
  
- **panel.tsx** - Admin dashboard
  - Real-time attendance count via onSnapshot
  - Check-in log with candidate details
  - CSV export functionality
  - Event tabs for filtering

- **guests.tsx** - Guest management
  - Add guests manually
  - Bulk CSV import with PapaParse
  - Guest status tracking (pending/registered)
  - Search functionality

#### Attendee Flow (`app/(attendee)/`)
- **register.tsx** - Registration screen
  - Name + email validation against guestList
  - FCM token collection
  - Automatic navigation to QR pass on success

- **qr-pass.tsx** - QR code display
  - Generated from unique qrToken (UUID v4)
  - Share functionality
  - Link to agenda view

- **agenda.tsx** - Event agenda
  - Fetches from events collection
  - Displays sessions with time, speaker, tag
  - Section list grouped by event

---

## 🔧 Key Features Implemented

### Business Logic (`utils/firestore.ts`)

#### Registration Flow
```typescript
validateAndRegisterAttendee(name, email, fcmToken)
1. Query guestList by email (case-insensitive)
2. Validate name matches guestList entry (case-insensitive)
3. Check if already registered (return existing QR token)
4. Generate UUID as qrToken
5. Batch write: update guestList doc + create candidates doc
6. Return success with qrToken
```

#### Check-in Flow
```typescript
validateAndCheckIn(qrToken, eventId, adminUid)
1. Query candidates by qrToken
2. Check for duplicate check-in (candidateId + eventId)
3. Create attendance record with scannedAt + scannedBy
4. Return success with candidate details
```

### Real-time Features
- `subscribeToAttendanceCount()` - Live check-in counter
- `subscribeToCheckInLog()` - Real-time check-in log updates

### Data Export
- CSV export from admin panel with candidate names, emails, times
- File sharing via Expo Sharing API
- Proper CSV escaping for special characters

### CSV Import
- PapaParse for robust CSV parsing
- Header detection (name, email columns required)
- Batch write for efficient Firestore operations
- Confirmation dialog before bulk upload

---

## 📦 Dependencies

### Firebase
- `@react-native-firebase/app` - Core Firebase
- `@react-native-firebase/auth` - Authentication
- `@react-native-firebase/firestore` - Database
- `@react-native-firebase/messaging` - Push notifications

### Navigation & UI
- `expo-router` - File-based routing
- `@react-navigation/native` - Navigation primitives
- `@react-navigation/bottom-tabs` - Tab navigation
- `@expo/vector-icons` - Icon library

### QR & Media
- `expo-camera` - Camera access for QR scanning
- `react-native-qrcode-svg` - QR code generation
- `expo-document-picker` - File picker for CSV
- `expo-file-system` - File I/O operations
- `expo-sharing` - Share files and data

### Data & Utilities
- `uuid` - Generate unique QR tokens
- `papaparse` - CSV parsing
- `@notifee/react-native` - In-app notifications (prepared for future use)

---

## 🚀 Setup Instructions

### Prerequisites
- Firebase project configured with Firestore, Authentication, and Cloud Messaging
- Custom claim setup: Admin users need `admin: true` custom claim via Cloud Function

### 1. Environment Setup
```bash
cd EventPass
npm install
```

### 2. Firebase Configuration
The app auto-initializes Firebase from google-services.json (Android) / GoogleService-Info.plist (iOS).

To use emulator locally:
- Set `useEmulator = true` in `config/firebase.ts`
- Run: `firebase emulators:start`

### 3. Run the App
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### 4. Test Accounts
Create test accounts via Firebase Auth Console and set custom claims:

```javascript
// In Firebase Cloud Function or Admin SDK
admin.auth().setCustomUserClaims(uid, { admin: true });
```

---

## 🔐 Admin Claim Detection

The app checks Firebase Auth ID token claims to determine if user is admin:

```typescript
const idTokenResult = await firebaseUser.getIdTokenResult();
const admin = idTokenResult.claims.admin === true;
```

**Setup in Firebase Console:**
1. Go to Authentication → Users
2. Click on admin user's UID
3. Set custom claim via Cloud Function or Admin SDK

---

## 📋 CSV Format

### Guest List Import
```csv
name,email
John Doe,john@example.com
Jane Smith,jane@example.com
```

### Check-in Export
```csv
Name,Email,Scanned At,Scanned By
John Doe,john@example.com,2026-04-29T10:30:00Z,admin-uid
```

---

## 🎯 Next Steps & Enhancements

### Phase 6 (Polish & Testing)
- [ ] Error handling UI improvements
- [ ] Loading state optimizations
- [ ] Network retry logic
- [ ] Offline support with local caching
- [ ] Unit and integration testing

### Future Features
- [ ] Email confirmations (Cloud Functions)
- [ ] SMS notifications (Firebase Cloud Messaging)
- [ ] Role-based permissions (speaker, volunteer, etc.)
- [ ] Event analytics dashboard
- [ ] Mobile app signing & distribution
- [ ] Push notifications via FCM
- [ ] Camera flash control options
- [ ] Barcode format support (beyond QR)

---

## 🐛 Troubleshooting

### Camera Permission Issues
**iOS:** Add to Info.plist:
```xml
<key>NSCameraUsageDescription</key>
<string>EventPass needs camera access to scan QR codes</string>
```

**Android:** Already configured in Expo manifest

### Firebase Connection Issues
- Verify firestore.rules allow read/write access for authenticated users
- Check network connectivity
- Enable emulator mode for local development

### CSV Import Failures
- Verify CSV headers are exactly `name` and `email`
- Ensure no empty rows between entries
- Check for special characters (use UTF-8 encoding)

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout with auth-based routing |
| `config/firebase.ts` | Firebase initialization |
| `context/AuthContext.tsx` | Auth state & admin detection |
| `utils/firestore.ts` | All Firestore operations & validation |
| `app/(auth)/login.tsx` | Authentication UI |
| `app/(admin)/*` | Admin screens (scanner, panel, guests) |
| `app/(attendee)/*` | Attendee screens (register, QR, agenda) |

---

## 📞 Support & Questions

For specific implementation questions, refer to:
- [React Native Firebase Docs](https://rnfirebase.io)
- [Expo Router Docs](https://docs.expo.dev/routing/introduction/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

---

**Last Updated:** April 29, 2026
**Status:** ✅ MVP Complete - Ready for Testing
