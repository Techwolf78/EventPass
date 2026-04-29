# EventPass - Complete File Structure

## 📂 Project Layout

```
EventPass/
├── app/
│   ├── _layout.tsx                    # Root layout with auth-based routing
│   ├── (auth)/
│   │   ├── _layout.tsx                # Auth group layout
│   │   └── login.tsx                  # Sign in / Sign up screen
│   ├── (admin)/
│   │   ├── _layout.tsx                # Admin tabs navigation
│   │   ├── scanner.tsx                # QR scanner with check-in
│   │   ├── panel.tsx                  # Admin dashboard
│   │   └── guests.tsx                 # Guest list management
│   └── (attendee)/
│       ├── _layout.tsx                # Attendee stack navigation
│       ├── register.tsx               # Registration form
│       ├── qr-pass.tsx                # QR code display
│       └── agenda.tsx                 # Event agenda
│
├── config/
│   └── firebase.ts                    # Firebase initialization
│
├── context/
│   └── AuthContext.tsx                # Auth state & admin detection
│
├── utils/
│   └── firestore.ts                   # Firestore operations & validation
│
├── components/                        # (Existing UI components)
├── constants/                         # (Existing constants)
├── hooks/                             # (Existing hooks)
├── assets/                            # (App images & icons)
│
├── package.json                       # Dependencies
├── app.json                           # Expo config
├── tsconfig.json                      # TypeScript config
│
├── EVENTPASS_BUILD.md                 # 📖 Complete documentation
├── QUICKSTART.md                      # 🚀 Testing guide
├── FILE_STRUCTURE.md                  # 📋 This file
└── README.md                          # Original project README
```

---

## 📄 New Files Created (13 files)

### Configuration
1. **config/firebase.ts** (32 lines)
   - Firebase initialization with Firestore, Auth, Messaging
   - Optional emulator configuration for local development
   
2. **context/AuthContext.tsx** (60 lines)
   - React Context for authentication state
   - Admin claim detection from Firebase ID token
   - Custom hook: `useAuth()`

3. **utils/firestore.ts** (341 lines)
   - Type definitions (GuestListItem, Candidate, EventData, AttendanceRecord)
   - Business logic functions
   - Firestore query helpers
   - Real-time subscription functions

### Authentication
4. **app/(auth)/_layout.tsx** (17 lines)
   - Stack layout for auth screens
   
5. **app/(auth)/login.tsx** (99 lines)
   - Firebase Authentication UI
   - Email/password sign up and login
   - Error handling with alerts

### Admin Screens
6. **app/(admin)/_layout.tsx** (39 lines)
   - Bottom tabs navigation
   - Icon setup with Ionicons
   
7. **app/(admin)/scanner.tsx** (209 lines)
   - QR code scanner with expo-camera
   - Event selection dropdown
   - Real-time check-in validation
   - Visual feedback (success/error)
   - Camera permission handling

8. **app/(admin)/panel.tsx** (279 lines)
   - Real-time attendance dashboard
   - Live check-in log with Firestore onSnapshot
   - CSV export with file sharing
   - Multi-event support with tabs
   - Candidate name resolution

9. **app/(admin)/guests.tsx** (362 lines)
   - Guest list display with search
   - Manual guest addition form
   - CSV import with PapaParse
   - Batch Firestore operations
   - Guest status badges (pending/registered)
   - Statistics summary

### Attendee Screens
10. **app/(attendee)/_layout.tsx** (39 lines)
    - Stack navigation for attendee flow
    - Logout button in header
    
11. **app/(attendee)/register.tsx** (95 lines)
    - Attendee registration form
    - FCM token collection
    - Firestore validation and data write
    - Auto-navigation to QR pass on success

12. **app/(attendee)/qr-pass.tsx** (104 lines)
    - QR code generation (uuid from registration)
    - QR code display using react-native-qrcode-svg
    - Share functionality with expo-sharing
    - Link to agenda view

13. **app/(attendee)/agenda.tsx** (157 lines)
    - Event agenda display
    - Grouped by event with SectionList
    - Shows time, speaker, session title, tag
    - Firestore data fetching

### Documentation
14. **EVENTPASS_BUILD.md** (300+ lines)
    - Complete architecture overview
    - Feature documentation
    - Setup instructions
    - Troubleshooting guide

15. **QUICKSTART.md** (250+ lines)
    - Testing workflows
    - Firebase setup guide
    - Test data creation
    - Common issues & solutions

16. **FILE_STRUCTURE.md** (This file)
    - Complete file reference
    - Function/feature mapping

---

## 🔗 Key Dependencies Added

### Firebase (4 packages)
```json
"@react-native-firebase/app": "^24.0.0"
"@react-native-firebase/auth": "^24.0.0"
"@react-native-firebase/firestore": "^24.0.0"
"@react-native-firebase/messaging": "^24.0.0"
```

### Navigation (1 package)
```json
"@react-navigation/stack": "^7.4.0"
```

### QR & Media (5 packages)
```json
"expo-camera": "^latest"
"react-native-qrcode-svg": "^latest"
"expo-document-picker": "^latest"
"expo-file-system": "^latest"
"expo-sharing": "^latest"
```

### Utilities (3 packages)
```json
"uuid": "^latest"
"papaparse": "^latest"
"@notifee/react-native": "^latest"
```

---

## 📊 Code Statistics

| Category | Files | Lines | Purpose |
|----------|-------|-------|---------|
| Config | 1 | 32 | Firebase setup |
| Context | 1 | 60 | Auth state |
| Utils | 1 | 341 | Business logic |
| Auth Flow | 2 | 116 | Sign in/up |
| Admin Flow | 3 | 890 | Scanner, panel, guests |
| Attendee Flow | 3 | 356 | Register, QR, agenda |
| Layouts | 2 | 56 | Navigation structure |
| **Total** | **16** | **~1,850** | **Full App** |

---

## 🔄 Data Flow Diagrams

### Authentication Flow
```
App Load
  ↓
onAuthStateChanged (AuthContext)
  ↓
Check Admin Claim
  ├─ Admin → (admin) routes
  ├─ Attendee → (attendee) routes
  └─ No User → (auth) routes
```

### Registration Flow
```
RegistrationScreen
  ↓
validateAndRegisterAttendee()
  ├─ Query guestList by email
  ├─ Validate name matches
  ├─ Check if already registered
  ├─ Generate UUID as qrToken
  ├─ Get FCM token
  ├─ Batch write (update guest + create candidate)
  └─ Navigate to QRPassScreen
```

### Check-in Flow
```
QRScannerScreen
  ↓
Scan QR Code → get qrToken
  ↓
validateAndCheckIn()
  ├─ Query candidates by qrToken
  ├─ Check for duplicate check-in
  ├─ Create attendance record
  └─ Return success/error
  ↓
Show Alert & Update Log
```

### Admin Panel Flow
```
AdminPanelScreen
  ↓
subscribeToAttendanceCount() + subscribeToCheckInLog()
  ↓
Real-time updates via onSnapshot
  ↓
Display count + log + export option
  ↓
User taps Export
  ↓
Generate CSV + Share file
```

---

## 🎯 Key Functions Mapping

### Authentication (`context/AuthContext.tsx`)
```typescript
useAuth()                              // Get auth state & logout
// Returns: { user, loading, isAdmin, logout }
```

### Business Logic (`utils/firestore.ts`)

**Registration:**
```typescript
validateAndRegisterAttendee(name, email, fcmToken)
// Returns: { success, message, qrToken? }
```

**Check-in:**
```typescript
validateAndCheckIn(qrToken, eventId, adminUid)
// Returns: { success, message, candidate? }
```

**Guest Management:**
```typescript
getGuestList()                         // Get all guests
addGuest(name, email)                  // Add single guest
addGuestsFromCSV(guests)               // Bulk add guests
```

**Events & Analytics:**
```typescript
getEvents()                            // Get all events
subscribeToAttendanceCount(eventId, callback)
subscribeToCheckInLog(eventId, callback)
getCandidateById(candidateId)
```

---

## 🔐 Firestore Rules Reference

**Suggested Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Guests can only read/write their own data
    match /candidates/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Admin can read check-ins and guest list
    match /attendance/{document=**} {
      allow read: if request.auth.token.admin == true;
      allow create: if request.auth.token.admin == true;
    }
    
    match /guestList/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
    
    // Anyone can read events
    match /events/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

---

## 📦 Installation Quick Reference

```bash
# Install all packages
npm install

# Check for linting issues
npm run lint

# Start development
npm run ios        # iOS Simulator
npm run android    # Android Emulator
npm run web        # Web browser
```

---

## 🚀 Deployment Checklist

- [ ] Connect real Firebase project
- [ ] Create Firestore collections with test data
- [ ] Set up Cloud Functions for admin claims
- [ ] Configure Firebase Security Rules
- [ ] Test on multiple devices
- [ ] Build signed APK/IPA
- [ ] Test app analytics
- [ ] Set up push notifications
- [ ] Deploy to App Stores

---

## 📞 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm install` |
| Camera won't open | Check permissions in native config |
| CSV import fails | Verify headers: `name,email` |
| Admin can't access | Verify custom claim `admin: true` |
| Real-time updates lag | Check Firestore subscription cleanup |

---

## 📚 Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **EVENTPASS_BUILD.md** | Complete architecture | Understanding the system |
| **QUICKSTART.md** | Testing & setup guide | Getting started with testing |
| **FILE_STRUCTURE.md** | This file | File reference & mapping |
| **README.md** | Original project info | Project overview |

---

**Last Updated:** April 29, 2026
**App Version:** 1.0.0 (MVP)
**Status:** ✅ Ready for Testing
