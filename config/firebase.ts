import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator,
  // @ts-ignore — getReactNativePersistence is exported at runtime but missing from Firebase v12 types
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDCrC1Y87PT821NBVnIUtC_loQAb5sn7Kk",
  authDomain: "event-mobile-app-fdaaf.firebaseapp.com",
  projectId: "event-mobile-app-fdaaf",
  storageBucket: "event-mobile-app-fdaaf.firebasestorage.app",
  messagingSenderId: "684334175892",
  appId: "1:684334175892:web:769203b6edf6f1322e8681",
  measurementId: "G-J37MRDLVLR"
};

// Initialize Firebase
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Firebase services
let auth: any;
if (Platform.OS === 'web') {
  auth = getAuth(firebaseApp);
} else {
  try {
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(firebaseApp);
  }
}

export { auth };

export const db = getFirestore(firebaseApp);

// Optional: Connect to emulators in development
const useEmulator = false; // Set to true to use local emulator

if (useEmulator && __DEV__) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (err: any) {
    if (!err.message.includes('already called')) {
      console.log('Emulator error (may be already connected):', err.message);
    }
  }
}

export default firebaseApp;
