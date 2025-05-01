
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Validate environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

if (!apiKey) {
  console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is not defined in environment variables.");
  // Optionally throw an error or return early depending on desired behavior
  // throw new Error("Firebase API Key is missing. Please check your .env file.");
}
if (!projectId) {
    console.error("Firebase Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined in environment variables.");
}


const firebaseConfig: FirebaseOptions = {
  apiKey: apiKey || "", // Use empty string as fallback to avoid undefined errors, though initialization might still fail
  authDomain: authDomain,
  projectId: projectId || "", // Use empty string as fallback
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
};

// Initialize Firebase only if config is partially valid (at least API key and Project ID)
let app;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // Set exports to null or handle the error appropriately
        // @ts-ignore - auth might not be initialized
        auth = null;
        // @ts-ignore - db might not be initialized
        db = null;
        // @ts-ignore - storage might not be initialized
        storage = null;
    }
} else {
    console.warn("Firebase configuration is incomplete. Skipping Firebase initialization.");
    // Set exports to null or handle the state appropriately
    // @ts-ignore
    auth = null;
    // @ts-ignore
    db = null;
    // @ts-ignore
    storage = null;
}


export { app, auth, db, storage };
