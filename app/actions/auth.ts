"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Create a user profile in Firestore after Firebase Auth registration.
 * Called from the client after createUserWithEmailAndPassword succeeds.
 */
export async function createProfileAction(
  uid: string,
  email: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!adminDb) {
      return { success: false, error: "Admin SDK not configured" };
    }

    await adminDb.collection("profiles").doc(uid).set({
      id: uid,
      email,
      full_name: fullName,
      role: "employee",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    console.error("createProfileAction error:", err);
    return { success: false, error: "Failed to create profile" };
  }
}
