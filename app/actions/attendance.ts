"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activityLogs";

/**
 * Get current authenticated user's UID + profile data
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
 * Returns today's date as YYYY-MM-DD in local timezone (PKT UTC+5)
 */
function todayDate(): string {
  const now = new Date();
  // Adjust for PKT (UTC+5)
  const pkOffset = 5 * 60;
  const local = new Date(now.getTime() + (pkOffset - now.getTimezoneOffset()) * 60000);
  return local.toISOString().split("T")[0];
}

/**
 * Returns current time as HH:MM string
 */
function nowTime(): string {
  const now = new Date();
  const pkOffset = 5 * 60;
  const local = new Date(now.getTime() + (pkOffset - now.getTimezoneOffset()) * 60000);
  return local.toISOString().split("T")[1].substring(0, 5);
}

/**
 * Determine attendance status based on check-in time
 * Late if after 09:30
 */
function deriveStatus(checkInTime: string): "present" | "late" {
  const [h, m] = checkInTime.split(":").map(Number);
  return h > 9 || (h === 9 && m > 30) ? "late" : "present";
}

/**
 * Calculate work hours between checkIn and checkOut (HH:MM strings)
 */
function calcWorkHours(checkIn: string, checkOut: string): number {
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  return parseFloat((mins / 60).toFixed(2));
}

/**
 * Action: Employee Check-In
 * Creates attendance doc for today. Fails if already checked in.
 */
export async function checkInAction() {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    const today = todayDate();
    const time = nowTime();

    // Document ID: employeeId_date (one record per employee per day)
    const docId = `${uid}_${today}`;
    const docRef = adminDb.collection("attendance").doc(docId);
    const existing = await docRef.get();

    if (existing.exists && existing.data()?.checkIn) {
      return { success: false, error: "Already checked in for today." };
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

    const status = deriveStatus(time);

    await docRef.set({
      id: docId,
      employeeId: uid,
      employeeName: profile.full_name || profile.email,
      managerId: managerId,
      date: today,
      checkIn: time,
      checkOut: null,
      status,
      workHours: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/employee/attendance");

    await logActivity({
      userId: uid,
      action: "checkin",
      module: "attendance",
      recordId: docId,
      details: { date: today, time, status },
    });

    return { success: true, checkIn: time, status };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Check-in failed.";
    return { success: false, error: msg };
  }
}

/**
 * Action: Employee Check-Out
 * Updates today's attendance doc with checkout time and calculated work hours.
 */
export async function checkOutAction() {
  try {
    const { uid } = await getAuthenticatedUser();
    const today = todayDate();
    const time = nowTime();
    const docId = `${uid}_${today}`;
    const docRef = adminDb.collection("attendance").doc(docId);
    const existing = await docRef.get();

    if (!existing.exists || !existing.data()?.checkIn) {
      return { success: false, error: "No check-in found for today. Please check in first." };
    }
    if (existing.data()?.checkOut) {
      return { success: false, error: "Already checked out for today." };
    }

    const checkIn = existing.data()!.checkIn as string;
    const workHours = calcWorkHours(checkIn, time);

    await docRef.update({
      checkOut: time,
      workHours,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/employee/attendance");

    await logActivity({
      userId: uid,
      action: "checkout",
      module: "attendance",
      recordId: docId,
      details: { date: today, checkIn, checkOut: time, workHours },
    });

    return { success: true, checkOut: time, workHours };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Check-out failed.";
    return { success: false, error: msg };
  }
}
