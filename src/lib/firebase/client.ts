
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration - Directly provided by user
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBC7NWwRj7dp0dWkhZqGayq40hTb1Ua_lE",
  authDomain: "callqa-c93b3.firebaseapp.com",
  projectId: "callqa-c93b3",
  storageBucket: "callqa-c93b3.appspot.com", // Corrected the domain for storage bucket
  messagingSenderId: "831035560702",
  appId: "1:831035560702:web:50fd8b2d1ac60b2033cbaf"
};

// Validate environment variables - Keeping this structure but using hardcoded values
const apiKey = firebaseConfig.apiKey;
const authDomain = firebaseConfig.authDomain;
const projectId = firebaseConfig.projectId;
const storageBucket = firebaseConfig.storageBucket;
const messagingSenderId = firebaseConfig.messagingSenderId;
const appId = firebaseConfig.appId;

if (!apiKey) {
  console.error("Firebase Error: apiKey is not defined in firebaseConfig.");
  // Optionally throw an error or return early depending on desired behavior
  // throw new Error("Firebase API Key is missing.");
}
if (!projectId) {
    console.error("Firebase Error: projectId is not defined in firebaseConfig.");
}


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
