// Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDA4Ia0fnlZ3NgQbCtWHQIeosBS0PUVLeo",
  authDomain: "centralteleoperadores.firebaseapp.com",
  projectId: "centralteleoperadores",
  storageBucket: "centralteleoperadores.firebasestorage.app",
  messagingSenderId: "260173879227",
  appId: "1:260173879227:web:80577712429c58d201969e",
  measurementId: "G-TLLE9RJBPM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
