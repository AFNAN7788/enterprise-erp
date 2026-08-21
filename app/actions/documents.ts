"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Delete a document record + its Storage file.
 * - Owner can delete their own file.
 * - Admin & HR can delete any file.
 */
export async function deleteDocumentAction(documentId: string) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) {
      return { success: false, error: "Authentication required." };
    }

    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    const role = profileSnap.exists ? profileSnap.data()?.role : null;

    const docRef = adminDb.collection("documents").doc(documentId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { success: false, error: "Document not found." };
    }

    const data = doc.data()!;
    const isOwner = data.uploadedBy === decoded.uid;
    const isAdminOrHR = role === "admin" || role === "hr";

    // Only owner, admin, or HR can delete
    if (!isOwner && !isAdminOrHR) {
      return { success: false, error: "Unauthorized. You can only delete your own files." };
    }

    // Delete the Firestore document
    await docRef.delete();

    // If we have Firebase Admin Storage available, delete the file too
    try {
      const { getStorage } = await import("firebase-admin/storage");
      const storage = getStorage();
      const fileRef = storage.bucket().file(data.storagePath);
      await fileRef.delete().catch(() => {
        // File might already be gone — ignore
      });
    } catch (storageErr) {
      console.warn("Storage delete skipped:", storageErr);
    }

    revalidatePath("/dashboard/documents");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete document.";
    return { success: false, error: msg };
  }
}