"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Query } from "firebase-admin/firestore";

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  module: string;
  recordId: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLogsResult {
  logs: ActivityLogEntry[];
  hasMore: boolean;
  lastDocId: string | null;
}

const PAGE_SIZE = 20;

/**
 * Fetch activity logs — ADMIN ONLY.
 * HR, Manager, and Employee roles are denied (both here and in firestore.rules).
 * Supports pagination (startAfter), module filter, and action filter.
 */
export async function getActivityLogsAction(params: {
  module?: string;
  action?: string;
  search?: string;
  lastDocId?: string | null;
}): Promise<ActivityLogsResult> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) {
      return { logs: [], hasMore: false, lastDocId: null };
    }

    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists || profileSnap.data()?.role !== "admin") {
      // Non-admin cannot access the audit trail
      return { logs: [], hasMore: false, lastDocId: null };
    }

    let query: Query = adminDb.collection("activityLogs");

    // Module filter
    if (params.module && params.module !== "all") {
      query = query.where("module", "==", params.module);
    }
    // Action filter
    if (params.action && params.action !== "all") {
      query = query.where("action", "==", params.action);
    }

    // Pagination — start after the last doc
    if (params.lastDocId) {
      const lastDoc = await adminDb.collection("activityLogs").doc(params.lastDocId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    query = query.orderBy("created_at", "desc").limit(PAGE_SIZE + 1);

    const snap = await query.get();
    const docs = snap.docs;
    const hasMore = docs.length > PAGE_SIZE;
    const pageDocs = docs.slice(0, PAGE_SIZE);

    const logs: ActivityLogEntry[] = pageDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || "",
        action: data.action || "",
        module: data.module || "",
        recordId: data.recordId || null,
        details: data.details || {},
        created_at:
          data.created_at?.toDate?.()?.toISOString() ||
          data.created_at ||
          new Date().toISOString(),
      };
    });

    return {
      logs,
      hasMore,
      lastDocId: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1].id : null,
    };
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    return { logs: [], hasMore: false, lastDocId: null };
  }
}