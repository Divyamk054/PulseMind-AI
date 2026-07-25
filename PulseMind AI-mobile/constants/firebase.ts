/**
 * Firebase configuration for PulseMind AI Mobile.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Open your PulseMind project (or create one)
 * 3. Project Settings → Your apps → Add app → Web
 * 4. Copy your firebaseConfig values below
 * 5. For Android native builds: add google-services.json to pulsemind-mobile/
 * 6. For iOS native builds: add GoogleService-Info.plist to pulsemind-mobile/
 *
 * The values below are PLACEHOLDERS — replace them with your real keys.
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "YOUR_FIREBASE_API_KEY",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "YOUR_PROJECT.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "YOUR_PROJECT_ID",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "YOUR_PROJECT.appspot.com",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "YOUR_SENDER_ID",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "YOUR_APP_ID",
};

// Prevent duplicate initialization in hot-reload
const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(firebaseApp);
export default firebaseApp;
