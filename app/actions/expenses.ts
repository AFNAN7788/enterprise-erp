"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.string().min(1, "Category is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  submittedBy: z.string().optional(),
});

export async function createExpenseAction(formData: FormData) {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required. Please sign in.");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const { category, amount, submittedBy } = expenseSchema.parse({
      category: formData.get("category"),
      amount: formData.get("amount"),
      submittedBy: decoded.uid,
    });

    await adminDb.collection("expenses").add({
      category,
      amount,
      submittedBy: submittedBy || decoded.uid,
      approvalStatus: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Log the expense creation
    await logActivity({
      userId: decoded.uid,
      action: "create",
      module: "finance",
      recordId: undefined,
      details: { category, amount },
    });

    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (err) {
    console.error("Error creating expense:", err);
    throw new Error("Failed to create expense. Please try again.");
  }
}

export async function updateExpenseStatusAction(expenseId: string, status: "approved" | "rejected") {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required. Please sign in.");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    
    // Only admin can approve/reject
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists || profileSnap.data()?.role !== "admin") {
      throw new Error("Unauthorized. Only administrators can perform this action.");
    }

    await adminDb.collection("expenses").doc(expenseId).update({
      approvalStatus: status,
      updated_at: new Date().toISOString(),
    });

    await logActivity({
      userId: decoded.uid,
      action: status === "approved" ? "approve" : "reject",
      module: "finance",
      recordId: expenseId,
      details: { status },
    });

    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (err) {
    console.error("Error updating expense status:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update expense status. Please try again." };
  }
}
