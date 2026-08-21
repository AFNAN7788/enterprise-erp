import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export type ActivityAction = "create" | "update" | "delete" | "approve" | "reject" | "checkin" | "checkout" | "status";

export interface ActivityLogInput {
  userId: string;
  action: ActivityAction;
  module: string;
  recordId?: string;
  details?: Record<string, unknown>;
}

/**
 * ─── Activity Logger (SERVER-ONLY) ────────────────────────────────────────────
 *
 * Reusable helper that logs every create/update/delete action into the
 * `activityLogs` collection. Uses the Admin SDK (backend) so it bypasses
 * client-side Firestore rules.
 *
 * The `activityLogs` collection is readable ONLY by the Admin role —
 * enforced both here (via the admin-only fetch action) and in firestore.rules.
 */
export async function logActivity(input: ActivityLogInput): Promise<string | null> {
  try {
    const docRef = adminDb.collection("activityLogs").doc();
    await docRef.set({
      id: docRef.id,
      userId: input.userId,
      action: input.action,
      module: input.module,
      recordId: input.recordId || null,
      details: input.details || {},
      created_at: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error("Error logging activity:", err);
    return null;
  }
}