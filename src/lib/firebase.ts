
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export async function getAuthClient() {
  if (typeof window === 'undefined') return null;
  const { getAuth } = await import('firebase/auth');
  return getAuth(app);
}

export const getDbClient = async () => {
    if (typeof window === 'undefined') return null;
    const { getFirestore } = await import('firebase/firestore');
    return getFirestore(app);
}

export const getAnalyticsClient = async () => {
    if (typeof window === 'undefined') return null;
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    return supported ? getAnalytics(app) : null;
};


export { app };
