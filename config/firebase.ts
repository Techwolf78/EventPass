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
  apiKey: "AIzaSyBQ-KgH3nVROWtiJkIvseiDQv5YWWRV6PU",
  authDomain: "eventpass-833eb.firebaseapp.com",
  projectId: "eventpass-833eb",
  storageBucket: "eventpass-833eb.firebasestorage.app",
  messagingSenderId: "461367194562",
  appId: "1:461367194562:web:30f0bbb28db5e49a11dc5b" 
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
