// Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// Using environment variables in development, real credentials for production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDA4Ia0fnlZ3NgQbCtWHQIeosBS0PUVLeo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "centralteleoperadores.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "centralteleoperadores",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "centralteleoperadores.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "260173879227",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:260173879227:web:80577712429c58d201969e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TLLE9PJBPH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Analytics (optional)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
