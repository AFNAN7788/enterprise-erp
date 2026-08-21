"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { computeCompanyStats, computeTeamStats, computeUserStats } from "@/lib/dashboardStats";
import type { DashboardStats } from "@/lib/dashboardStats";

/**
 * Fetch dashboard stats based on the user's role.
 * - Admin → company-wide stats (dashboardStats/company)
 * - Manager → team stats (dashboardStats/team_{managerId})
 * - Employee → personal stats (dashboardStats/user_{uid})
 *
 * If the summary doc doesn't exist yet, it computes it on-demand.
 */
export async function getDashboardStatsAction(): Promise<{ stats: DashboardStats | null; role: string }> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) return { stats: null, role: "" };

    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) return { stats: null, role: "" };

    const role = profileSnap.data()?.role as string;

    if (role === "admin") {
      const doc = await adminDb.collection("dashboardStats").doc("company").get();
      if (doc.exists) {
        return { stats: doc.data() as DashboardStats, role };
      }
      // Compute on-demand if not present
      const stats = await computeCompanyStats();
      return { stats, role };
    }

    if (role === "manager") {
      const doc = await adminDb.collection("dashboardStats").doc(`team_${decoded.uid}`).get();
      if (doc.exists) {
        return { stats: doc.data() as DashboardStats, role };
      }
      const stats = await computeTeamStats(decoded.uid);
      return { stats, role };
    }

    // Employee (and any other role)
    const doc = await adminDb.collection("dashboardStats").doc(`user_${decoded.uid}`).get();
    if (doc.exists) {
      return { stats: doc.data() as DashboardStats, role };
    }
    const stats = await computeUserStats(decoded.uid);
    return { stats, role };
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    return { stats: null, role: "" };
  }
}

/**
 * Recompute dashboard stats for the current user's scope (on-demand refresh).
 */
export async function refreshDashboardStatsAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) return { success: false };

    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) return { success: false };

    const role = profileSnap.data()?.role as string;

    if (role === "admin") {
      await computeCompanyStats();
    } else if (role === "manager") {
      await computeTeamStats(decoded.uid);
    } else {
      await computeUserStats(decoded.uid);
    }

    return { success: true };
  } catch (err) {
    console.error("Error refreshing dashboard stats:", err);
    return { success: false };
  }
}