import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBQX69doUBY18RstTSmcNtBP5STIGYPNKc",
  authDomain: "dataa-c7e08.firebaseapp.com",
  projectId: "dataa-c7e08",
  storageBucket: "dataa-c7e08.appspot.com",
  messagingSenderId: "181556742888",
  appId: "1:181556742888:web:c14403e6440b087b81d75d",
  measurementId: "G-RDSH3M1MWS"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;