import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import config from "./firebase-config.json";

// Firebase Web configuration is public client configuration, not an Admin key.
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Explicit opt-in only: localhost normally connects to the real course project.
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
