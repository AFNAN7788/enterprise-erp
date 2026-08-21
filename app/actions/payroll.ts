"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";

const payrollSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required."),
  basicSalary: z.coerce.number().positive("Basic salary must be positive."),
  bonus: z.coerce.number().default(0),
  deductions: z.coerce.number().default(0),
  month: z.coerce.number().int().min(1).max(12, "Month must be between 1-12"),
  year: z.coerce.number().int().min(2020, "Year must be at least 2020"),
});

export async function createPayrollAction(formData: FormData) {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required. Please sign in.");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    
    // Only admin can create payroll
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists || profileSnap.data()?.role !== "admin") {
      throw new Error("Unauthorized. Only administrators can perform this action.");
    }

    const { employeeId, basicSalary, bonus, deductions, month, year } = payrollSchema.parse({
      employeeId: formData.get("employeeId") as string,
      basicSalary: formData.get("basicSalary") as unknown as string,
      bonus: formData.get("bonus") as unknown as string,
      deductions: formData.get("deductions") as unknown as string,
      month: formData.get("month") as unknown as string,
      year: formData.get("year") as unknown as string,
    });

    // Calculate net salary
    const netSalary = basicSalary + bonus - deductions;

    // Check if payroll already exists for this employee/month/year
    const existingSnap = await adminDb.collection("payroll")
      .where("employeeId", "==", employeeId)
      .where("month", "==", month)
      .where("year", "==", year)
      .get();

    if (existingSnap.empty === false) {
      throw new Error("Payroll already exists for this employee in the selected month/year.");
    }

    const payrollRef = await adminDb.collection("payroll").add({
      employeeId,
      basicSalary,
      bonus,
      deductions,
      netSalary,
      month,
      year,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await logActivity({
      userId: decoded.uid,
      action: "create",
      module: "finance",
      recordId: payrollRef.id,
      details: { employeeId, month, year, netSalary },
    });

    revalidatePath("/dashboard/payroll");
    return { success: true };
  } catch (err) {
    console.error("Error creating payroll:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create payroll record. Please try again." };
  }
}

export async function getEmployeePayrollHistory(employeeId: string) {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return [];

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    
    // Employees can only view their own history, admins can view all
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    const isAdmin = profileSnap.exists && profileSnap.data()?.role === "admin";

let query = adminDb.collection("payroll") as any;

    if (!isAdmin) {
      query = query.where("employeeId", "==", decoded.uid);
    }

    const snap = await (query as any).orderBy("year", "desc").orderBy("month", "desc").get();

    const history = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return history;
  } catch (err) {
    console.error("Error fetching payroll history:", err);
    return [];
  }
}

export async function getPayrollRecord(recordId: string) {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    
    const doc = await adminDb.collection("payroll").doc(recordId).get();
    if (!doc.exists) return null;

    const data = doc.data();

    // Check permissions
    const isAdmin = decoded.role === "admin";
    const isOwnRecord = data?.employeeId === decoded.uid;

    if (isAdmin || isOwnRecord) {
      return { id: doc.id, ...data };
    }

    return null;
  } catch (err) {
    console.error("Error fetching payroll record:", err);
    return null;
  }
}