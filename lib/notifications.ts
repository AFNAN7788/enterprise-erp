import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationType } from "@/types";

/**
 * ─── Notification creator (SERVER-ONLY) ───────────────────────────────────────
 *
 * This is the ONLY place notifications are created in the app.
 * It uses the Firebase Admin SDK (backend) which bypasses Firestore
 * client-side security rules entirely.
 *
 * Client-side users CANNOT create notifications — Firestore rules
 * deny all writes to the `notifications` collection from the web SDK.
 */
export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}): Promise<string | null> {
  try {
    const docRef = adminDb.collection("notifications").doc();
    await docRef.set({
      id: docRef.id,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link || null,
      isRead: false,
      created_at: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating notification:", err);
    return null;
  }
}