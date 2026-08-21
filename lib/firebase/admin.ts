import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app;

if (getApps().length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      const formattedKey = privateKey
        .replace(/\\n/g, "\n")
        .replace(/"/g, "")
        .trim();

      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
    } else if (projectId) {
      app = initializeApp({ projectId });
    } else {
      app = initializeApp();
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
} else {
  app = getApp();
}

export const adminAuth = app ? getAuth(app) : null!;
export const adminDb = app ? getFirestore(app) : null!;
export default app;
