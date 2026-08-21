"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activityLogs";
import type { LeaveType } from "@/types";

/**
 * Get current authenticated user's UID + profile
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required.");

  const decoded = await adminAuth.verifyIdToken(session);
  const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
  if (!profileSnap.exists) throw new Error("User profile not found.");

  return { uid: decoded.uid, profile: profileSnap.data()! };
}

/**
 * Verify user is HR or Admin — for approve/reject actions
 */
async function verifyHRorAdmin(uid: string, role: string) {
  if (role !== "admin" && role !== "hr" && role !== "manager") {
    throw new Error("Unauthorized. Only Admin, HR, or Manager can perform this action.");
  }
}

export interface SubmitLeaveInput {
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
}

/**
 * Action: Submit Leave Request (Employee only)
 * Creates a leaveRequest doc with status = "pending"
 */
export async function submitLeaveRequestAction(data: SubmitLeaveInput) {
  try {
    const { uid, profile } = await getAuthenticatedUser();

    // Validate dates
    if (!data.startDate || !data.endDate || !data.reason || !data.type) {
      return { success: false, error: "All fields are required." };
    }
    if (new Date(data.endDate) < new Date(data.startDate)) {
      return { success: false, error: "End date cannot be before start date." };
    }

    // Get employee's managerId from employees collection
    let managerId: string | null = null;
    const empQuery = await adminDb
      .collection("employees")
      .where("profileId", "==", uid)
      .limit(1)
      .get();
    if (!empQuery.empty) {
      managerId = empQuery.docs[0].data().managerId || null;
    }

    const docRef = adminDb.collection("leaveRequests").doc();
    await docRef.set({
      id: docRef.id,
      employeeId: uid,
      employeeName: profile.full_name || profile.email,
      managerId: managerId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      status: "pending",
      reviewedBy: null,
      reviewerName: null,
      reviewNote: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/employee/leave");
    revalidatePath("/dashboard/hr/leave");
    revalidatePath("/dashboard/manager/leave");

    await logActivity({
      userId: uid,
      action: "create",
      module: "leaves",
      recordId: docRef.id,
      details: { type: data.type, startDate: data.startDate, endDate: data.endDate },
    });

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit leave request.";
    return { success: false, error: msg };
  }
}

/**
 * Action: Approve Leave Request (HR / Manager / Admin only)
 */
export async function approveLeaveRequestAction(requestId: string, reviewNote?: string) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    const role = profile.role as string;
    await verifyHRorAdmin(uid, role);

    const docRef = adminDb.collection("leaveRequests").doc(requestId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Leave request not found." };

    // Manager can only approve their own team's requests
    if (role === "manager" && doc.data()?.managerId !== uid) {
      return { success: false, error: "Unauthorized. You can only manage your team's requests." };
    }

    const leaveData = doc.data()!;

    await docRef.update({
      status: "approved",
      reviewedBy: uid,
      reviewerName: profile.full_name || profile.email,
      reviewNote: reviewNote || null,
      updated_at: FieldValue.serverTimestamp(),
    });

    // Notify the employee that their leave was approved
    await createNotification({
      userId: leaveData.employeeId,
      title: "Leave Approved",
      message: `Your ${leaveData.type || "leave"} request (${leaveData.startDate || ""} → ${leaveData.endDate || ""}) was approved by ${profile.full_name || profile.email}.`,
      type: "leave",
      link: "/dashboard/employee/leave",
    });

    revalidatePath("/dashboard/hr/leave");
    revalidatePath("/dashboard/manager/leave");
    revalidatePath("/dashboard/employee/leave");

    await logActivity({
      userId: uid,
      action: "approve",
      module: "leaves",
      recordId: requestId,
      details: { employeeId: leaveData.employeeId, type: leaveData.type },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve leave request.";
    return { success: false, error: msg };
  }
}

/**
 * Action: Reject Leave Request (HR / Manager / Admin only)
 */
export async function rejectLeaveRequestAction(requestId: string, reviewNote?: string) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    const role = profile.role as string;
    await verifyHRorAdmin(uid, role);

    const docRef = adminDb.collection("leaveRequests").doc(requestId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Leave request not found." };

    // Manager can only reject their own team's requests
    if (role === "manager" && doc.data()?.managerId !== uid) {
      return { success: false, error: "Unauthorized. You can only manage your team's requests." };
    }

    const leaveData = doc.data()!;

    await docRef.update({
      status: "rejected",
      reviewedBy: uid,
      reviewerName: profile.full_name || profile.email,
      reviewNote: reviewNote || null,
      updated_at: FieldValue.serverTimestamp(),
    });

    // Notify the employee that their leave was rejected
    await createNotification({
      userId: leaveData.employeeId,
      title: "Leave Rejected",
      message: `Your ${leaveData.type || "leave"} request (${leaveData.startDate || ""} → ${leaveData.endDate || ""}) was rejected${reviewNote ? `: ${reviewNote}` : ""}.`,
      type: "leave",
      link: "/dashboard/employee/leave",
    });

    revalidatePath("/dashboard/hr/leave");
    revalidatePath("/dashboard/manager/leave");
    revalidatePath("/dashboard/employee/leave");

    await logActivity({
      userId: uid,
      action: "reject",
      module: "leaves",
      recordId: requestId,
      details: { employeeId: leaveData.employeeId, type: leaveData.type },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reject leave request.";
    return { success: false, error: msg };
  }
}
