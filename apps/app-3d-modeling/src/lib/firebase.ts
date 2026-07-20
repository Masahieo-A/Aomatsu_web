import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let app: FirebaseApp | null = null;
let database: Database | null = null;

function initFirebase() {
  if (typeof window === "undefined") return;
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) return;
  if (app) return;
  app = getApps().length ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig);
  database = getDatabase(app);
}

export function getDatabaseSafe(): Database | null {
  initFirebase();
  return database;
}

export { app, database };

export function getDataPath(roomId: "room1" | "room2"): string {
  return `/rooms/${roomId}/objects`;
}
