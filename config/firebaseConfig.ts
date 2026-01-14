import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore'; // ✅ Changed from getFirestore
import { getStorage } from 'firebase/storage';

// Your configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIZFWymXq_xaDkWGIUGZ2N4fgSEg5QjrY",
  authDomain: "aniyu-b841b.firebaseapp.com",
  projectId: "aniyu-b841b",
  storageBucket: "aniyu-b841b.firebasestorage.app",
  messagingSenderId: "891600067276",
  appId: "1:891600067276:web:015bfa2c568718a3530069",
  measurementId: "G-N8BEEP8PEC"
};

// 1. Initialize App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth with Persistence (CRITICAL for Mobile)
// This tells Firebase to use the phone's storage to remember the user
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// 3. Initialize Database (✅ FIXED: Using Long Polling to prevent transport errors)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, 
});

const storage = getStorage(app);

// 4. Export them for use in the app
export { auth, db, storage };
