"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Mark a notification as read — only the owner (userId) can do this.
 * Enforced by both this server action and Firestore security rules.
 */
export async function markNotificationReadAction(notificationId: string) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) {
      return { success: false, error: "Authentication required." };
    }

    const decoded = await adminAuth.verifyIdToken(session);
    const docRef = adminDb.collection("notifications").doc(notificationId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { success: false, error: "Notification not found." };
    }

    // Only the owner can mark their own notification as read
    if (doc.data()?.userId !== decoded.uid) {
      return { success: false, error: "Unauthorized." };
    }

    await docRef.update({
      isRead: true,
      updated_at: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark notification as read.";
    return { success: false, error: msg };
  }
}