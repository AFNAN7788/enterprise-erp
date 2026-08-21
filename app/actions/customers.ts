"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";
import type { CustomerStatus, InteractionType } from "@/types";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required."),
  company: z.string().optional().nullable(),
  email: z.string().email("Invalid email.").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  status: z.enum(["lead", "prospect", "active", "inactive"]),
  assignedTo: z.string().min(1, "Assignee is required."),
  notes: z.string().optional().nullable(),
});

const interactionSchema = z.object({
  type: z.enum(["call", "email", "meeting"]),
  subject: z.string().min(1, "Subject is required."),
  notes: z.string().optional().nullable(),
});

type CustomerInput = z.infer<typeof customerSchema>;
type InteractionInput = z.infer<typeof interactionSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required.");

  const decoded = await adminAuth.verifyIdToken(session);
  const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
  if (!profileSnap.exists) throw new Error("User profile not found.");

  return { uid: decoded.uid, profile: profileSnap.data()! };
}

async function isAdminUser(uid: string): Promise<boolean> {
  const profileSnap = await adminDb.collection("profiles").doc(uid).get();
  return profileSnap.exists && profileSnap.data()?.role === "admin";
}

// ─── Customer Actions ─────────────────────────────────────────────────────────

export async function createCustomerAction(data: CustomerInput) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    const validated = customerSchema.parse(data);

    // Non-admins can only assign customers to themselves
    if (!(await isAdminUser(uid)) && validated.assignedTo !== uid) {
      return { success: false, error: "You can only assign customers to yourself." };
    }

    const docRef = adminDb.collection("customers").doc();
    await docRef.set({
      id: docRef.id,
      name: validated.name,
      company: validated.company || null,
      email: validated.email || null,
      phone: validated.phone || null,
      status: validated.status,
      assignedTo: validated.assignedTo,
      assignedToName: profile.full_name || profile.email,
      notes: validated.notes || null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/crm");

    await logActivity({
      userId: uid,
      action: "create",
      module: "crm",
      recordId: docRef.id,
      details: { name: validated.name, company: validated.company, status: validated.status },
    });

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create customer.";
    return { success: false, error: msg };
  }
}

export async function updateCustomerAction(customerId: string, data: Partial<CustomerInput>) {
  try {
    const { uid } = await getAuthenticatedUser();
    const validated = customerSchema.partial().parse(data);

    const docRef = adminDb.collection("customers").doc(customerId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Customer not found." };

    const current = doc.data()!;
    // Non-admins can only edit their own customers
    if (!(await isAdminUser(uid)) && current.assignedTo !== uid) {
      return { success: false, error: "Unauthorized. You can only edit your own customers." };
    }
    // Non-admins cannot reassign to someone else
    if (!(await isAdminUser(uid)) && validated.assignedTo && validated.assignedTo !== uid) {
      return { success: false, error: "You can only keep customers assigned to yourself." };
    }

    await docRef.update({
      ...validated,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/crm");
    revalidatePath(`/dashboard/crm/${customerId}`);

    await logActivity({
      userId: uid,
      action: "update",
      module: "crm",
      recordId: customerId,
      details: { ...validated },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update customer.";
    return { success: false, error: msg };
  }
}

export async function deleteCustomerAction(customerId: string) {
  try {
    const { uid } = await getAuthenticatedUser();
    const docRef = adminDb.collection("customers").doc(customerId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Customer not found." };

    if (!(await isAdminUser(uid)) && doc.data()!.assignedTo !== uid) {
      return { success: false, error: "Unauthorized. You can only delete your own customers." };
    }

    // Delete interactions subcollection first
    const interactions = await docRef.collection("interactions").get();
    const batch = adminDb.batch();
    interactions.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(docRef);
    await batch.commit();

    revalidatePath("/dashboard/crm");

    await logActivity({
      userId: uid,
      action: "delete",
      module: "crm",
      recordId: customerId,
      details: { name: doc.data()?.name },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete customer.";
    return { success: false, error: msg };
  }
}

// ─── Interaction Actions ──────────────────────────────────────────────────────

export async function addInteractionAction(customerId: string, data: InteractionInput) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    const validated = interactionSchema.parse(data);

    const customerRef = adminDb.collection("customers").doc(customerId);
    const customerDoc = await customerRef.get();
    if (!customerDoc.exists) return { success: false, error: "Customer not found." };

    // Non-admins can only add interactions to their own customers
    if (!(await isAdminUser(uid)) && customerDoc.data()!.assignedTo !== uid) {
      return { success: false, error: "Unauthorized. You can only interact with your own customers." };
    }

    const interactionRef = customerRef.collection("interactions").doc();
    await interactionRef.set({
      id: interactionRef.id,
      customerId,
      type: validated.type,
      subject: validated.subject,
      notes: validated.notes || null,
      createdBy: uid,
      createdByName: profile.full_name || profile.email,
      created_at: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/dashboard/crm/${customerId}`);

    await logActivity({
      userId: uid,
      action: "create",
      module: "crm",
      recordId: interactionRef.id,
      details: { customerId, type: validated.type, subject: validated.subject },
    });

    return { success: true, id: interactionRef.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add interaction.";
    return { success: false, error: msg };
  }
}

export async function deleteInteractionAction(customerId: string, interactionId: string) {
  try {
    const { uid } = await getAuthenticatedUser();
    const customerRef = adminDb.collection("customers").doc(customerId);
    const customerDoc = await customerRef.get();
    if (!customerDoc.exists) return { success: false, error: "Customer not found." };

    if (!(await isAdminUser(uid)) && customerDoc.data()!.assignedTo !== uid) {
      return { success: false, error: "Unauthorized." };
    }

    await customerRef.collection("interactions").doc(interactionId).delete();
    revalidatePath(`/dashboard/crm/${customerId}`);

    await logActivity({
      userId: uid,
      action: "delete",
      module: "crm",
      recordId: interactionId,
      details: { customerId },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete interaction.";
    return { success: false, error: msg };
  }
}