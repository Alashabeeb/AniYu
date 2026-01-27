import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ EXPORT THIS VARIABLE so we can use it in Users.jsx for Secondary App creation
export const firebaseConfig = {
  apiKey: "AIzaSyAIZFWymXq_xaDkWGIUGZ2N4fgSEg5QjrY",
  authDomain: "aniyu-b841b.firebaseapp.com",
  projectId: "aniyu-b841b",
  storageBucket: "aniyu-b841b.firebasestorage.app",
  messagingSenderId: "891600067276",
  appId: "1:891600067276:web:015bfa2c568718a3530069",
  measurementId: "G-N8BEEP8PEC"
};

// Initialize Firebase (Standard Web Version)
const app = initializeApp(firebaseConfig);

// ✅ WEB AUTH
export const auth = getAuth(app);

// ✅ WEB DATABASE
export const db = getFirestore(app);

// ✅ WEB STORAGE
export const storage = getStorage(app);

// Optional: Analytics
// export const analytics = getAnalytics(app);