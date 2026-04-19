import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDataConnect } from "firebase/data-connect";
import { connectorConfig } from "../dataconnect-generated";

// Note: In a real application, you would use environment variables for these values.
// For now, we use a placeholder structure.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getFirebaseAdminApp() {
  if (getApps().length === 0) {
    if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
       && firebaseConfig.storageBucket && firebaseConfig.messagingSenderId
       && firebaseConfig.appId && firebaseConfig.measurementId) {
      return initializeApp(firebaseConfig);
    } else {
      // Fallback for local development if env vars are missing
      // In production, this would fail.
      console.warn('Firebase environment variables are missing. Firestore might not work.');
      return initializeApp({
        projectId: 'mylife-app-placeholder', // Replace with your project ID
      });
    }
  }
  return getApp();
}

// Initialize Firebase
const app = getFirebaseAdminApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const dataConnect = getDataConnect(app, connectorConfig);

// Analytics is only supported in the browser
const analytics = typeof window !== "undefined" ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

export { app, auth, db, dataConnect, analytics };