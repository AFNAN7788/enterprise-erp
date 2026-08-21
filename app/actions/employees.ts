"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";

// Zod Schema for validation on the server side
const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").optional(),
  phone: z.string().optional().nullable(),
  department: z.string().min(1, "Department is required."),
  position: z.string().min(1, "Position is required."),
  status: z.enum(["active", "inactive"]),
  managerId: z.string().optional().nullable(),
  salary: z.coerce.number().min(0, "Salary must be a positive number.").optional().nullable(),
  hireDate: z.string().min(1, "Hire date is required."),
  role: z.enum(["employee", "manager", "admin", "hr"]),
});

type EmployeeInput = z.infer<typeof employeeSchema>;

/**
 * Verifies that the request is authenticated and that the user is an Admin.
 * Returns the Admin's UID if successful, otherwise throws an error.
 */
async function verifyAdminRole() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;

  if (!session) {
    throw new Error("Authentication required. Please sign in.");
  }

  try {
    // Decodes and verifies the Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(session);
    const uid = decodedToken.uid;

    // Checks user's role in the profiles collection
    const profileSnap = await adminDb.collection("profiles").doc(uid).get();
    if (!profileSnap.exists) {
      throw new Error("User profile not found.");
    }

    const userData = profileSnap.data();
    if (userData?.role !== "admin") {
      throw new Error("Unauthorized. Only administrators can perform this action.");
    }

    return uid;
  } catch (error: unknown) {
    console.error("Authorization check failed:", error);
    const msg = error instanceof Error ? error.message : "Invalid session token.";
    throw new Error(msg);
  }
}

/**
 * Action: Create Employee
 * Creates an Auth user, creates a profile, and creates an employee record.
 */
export async function createEmployeeAction(data: EmployeeInput) {
  try {
    const adminUid = await verifyAdminRole();

    // Validate request data
    const validatedData = employeeSchema.parse(data);

    if (!validatedData.password) {
      return { success: false, error: "Password is required for new employees." };
    }

    // 1. Create User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: validatedData.fullName,
    });

    const uid = userRecord.uid;

    // 2. Create Profile document in Firestore
    await adminDb.collection("profiles").doc(uid).set({
      id: uid,
      email: validatedData.email,
      full_name: validatedData.fullName,
      role: validatedData.role,
      avatar_url: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // 3. Create Employee document in Firestore (linked to profileId)
    const employeeRef = adminDb.collection("employees").doc(); // auto-gen employee document ID
    await employeeRef.set({
      id: employeeRef.id,
      profileId: uid,
      fullName: validatedData.fullName,
      email: validatedData.email,
      phone: validatedData.phone || null,
      department: validatedData.department,
      position: validatedData.position,
      status: validatedData.status,
      managerId: validatedData.managerId || null,
      salary: validatedData.salary || null,
      hireDate: validatedData.hireDate,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/admin/employees");
    revalidatePath("/dashboard/hr/employees");

    await logActivity({
      userId: adminUid,
      action: "create",
      module: "employees",
      recordId: employeeRef.id,
      details: { fullName: validatedData.fullName, email: validatedData.email, department: validatedData.department },
    });

    return { success: true, employeeId: employeeRef.id };
  } catch (error: unknown) {
    console.error("Error creating employee:", error);
    const msg = error instanceof Error ? error.message : "Failed to create employee.";
    return { success: false, error: msg };
  }
}

/**
 * Action: Update Employee
 * Updates the employee details in Firestore and syncs name/email to profile and Auth.
 */
export async function updateEmployeeAction(employeeDocId: string, data: Partial<EmployeeInput>) {
  try {
    const adminUid = await verifyAdminRole();

    // Check if employee exists
    const employeeDoc = await adminDb.collection("employees").doc(employeeDocId).get();
    if (!employeeDoc.exists) {
      return { success: false, error: "Employee record not found." };
    }

    const currentEmployeeData = employeeDoc.data();
    const profileId = currentEmployeeData?.profileId;

    // Partial validate input fields
    const validatedData = employeeSchema.partial().parse(data);

    // 1. Update Firebase Auth if Email or Name changed
    if (profileId && (validatedData.email || validatedData.fullName)) {
      const authUpdates: { email?: string; displayName?: string } = {};
      if (validatedData.email) authUpdates.email = validatedData.email;
      if (validatedData.fullName) authUpdates.displayName = validatedData.fullName;

      await adminAuth.updateUser(profileId, authUpdates);
    }

    // 2. Update Profile document in Firestore
    if (profileId) {
      const profileUpdates: Record<string, unknown> = {
        updated_at: FieldValue.serverTimestamp(),
      };
      if (validatedData.email) profileUpdates.email = validatedData.email;
      if (validatedData.fullName) profileUpdates.full_name = validatedData.fullName;
      if (validatedData.role) profileUpdates.role = validatedData.role;

      await adminDb.collection("profiles").doc(profileId).update(profileUpdates);
    }

    // 3. Update Employee document in Firestore
    const employeeUpdates: Record<string, unknown> = {
      ...validatedData,
      updated_at: FieldValue.serverTimestamp(),
    };
    // Delete password if it was passed partially
    delete employeeUpdates.password;

    await adminDb.collection("employees").doc(employeeDocId).update(employeeUpdates);

    revalidatePath("/dashboard/admin/employees");
    revalidatePath("/dashboard/hr/employees");

    await logActivity({
      userId: adminUid,
      action: "update",
      module: "employees",
      recordId: employeeDocId,
      details: { ...validatedData },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating employee:", error);
    const msg = error instanceof Error ? error.message : "Failed to update employee.";
    return { success: false, error: msg };
  }
}

/**
 * Action: Delete Employee
 * Deletes employee record, profile record, and Auth account.
 */
export async function deleteEmployeeAction(employeeDocId: string) {
  try {
    const adminUid = await verifyAdminRole();

    const employeeDoc = await adminDb.collection("employees").doc(employeeDocId).get();
    if (!employeeDoc.exists) {
      return { success: false, error: "Employee record not found." };
    }

    const profileId = employeeDoc.data()?.profileId;

    // 1. Delete Employee document
    await adminDb.collection("employees").doc(employeeDocId).delete();

    // 2. Delete Profile document & Firebase Auth User
    if (profileId) {
      await adminDb.collection("profiles").doc(profileId).delete();
      try {
        await adminAuth.deleteUser(profileId);
      } catch (authErr) {
        console.warn(`Auth user ${profileId} could not be deleted or does not exist:`, authErr);
      }
    }

    revalidatePath("/dashboard/admin/employees");
    revalidatePath("/dashboard/hr/employees");

    await logActivity({
      userId: adminUid,
      action: "delete",
      module: "employees",
      recordId: employeeDocId,
      details: { fullName: employeeDoc.data()?.fullName, email: employeeDoc.data()?.email },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting employee:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete employee.";
    return { success: false, error: msg };
  }
}

/**
 * Action: Toggle Employee Status (Activate/Deactivate)
 * Simply toggles employee's status in Firestore.
 */
export async function toggleEmployeeStatusAction(employeeDocId: string, status: "active" | "inactive") {
  try {
    const adminUid = await verifyAdminRole();

    const employeeDoc = await adminDb.collection("employees").doc(employeeDocId).get();
    if (!employeeDoc.exists) {
      return { success: false, error: "Employee record not found." };
    }

    await adminDb.collection("employees").doc(employeeDocId).update({
      status,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/admin/employees");
    revalidatePath("/dashboard/hr/employees");

    await logActivity({
      userId: adminUid,
      action: "status",
      module: "employees",
      recordId: employeeDocId,
      details: { status },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error toggling employee status:", error);
    const msg = error instanceof Error ? error.message : "Failed to change employee status.";
    return { success: false, error: msg };
  }
}
