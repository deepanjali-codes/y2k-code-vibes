// Firebase app + services initializer
// Config is read from Vite env vars — set them in your .env file.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Safety check — warn dev if any required config key is missing
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingKeys.length > 0) {
  console.warn(
    `[Codelens] Missing Firebase env vars: ${missingKeys.join(", ")}\n` +
    "Set them in your .env file in the project root.\n" +
    "Auth and history features will not work without them."
  );
}

// Avoid duplicate app initialization during HMR
// Wrapped in try/catch so a bad config doesn't white-screen the app
let app: FirebaseApp;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (err) {
  console.error("[Codelens] Firebase initialization failed:", err);
  // Create a minimal app so getAuth/getFirestore don't throw on import
  // The auth listener timeout in useAuth will handle the fallback
  app = initializeApp({ apiKey: "dummy", projectId: "dummy", appId: "dummy" }, "__fallback__");
}

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export default app;
 