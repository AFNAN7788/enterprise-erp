"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "active", "on_hold", "completed"]),
  clientId: z.string().optional().nullable(),
  managerId: z.string().min(1, "Project manager is required."),
  teamMembers: z.array(z.string()).optional(),
});

type ProjectInput = z.infer<typeof projectSchema>;

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required.");

  const decoded = await adminAuth.verifyIdToken(session);
  const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
  if (!profileSnap.exists) throw new Error("User profile not found.");

  return { uid: decoded.uid, profile: profileSnap.data()! };
}

async function verifyAdminOrManager(uid: string): Promise<boolean> {
  const profileSnap = await adminDb.collection("profiles").doc(uid).get();
  const role = profileSnap.exists ? profileSnap.data()?.role : null;
  return role === "admin" || role === "manager";
}

export async function createProjectAction(data: ProjectInput) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can create projects." };
    }

    const validated = projectSchema.parse(data);

    // Resolve client name from CRM customers
    let clientName: string | null = null;
    if (validated.clientId) {
      const clientDoc = await adminDb.collection("customers").doc(validated.clientId).get();
      if (clientDoc.exists) clientName = clientDoc.data()?.name || null;
    }

    // Resolve manager name
    let managerName: string | null = null;
    const managerDoc = await adminDb.collection("profiles").doc(validated.managerId).get();
    if (managerDoc.exists) {
      const m = managerDoc.data()!;
      managerName = m.full_name || m.email || null;
    }

    const docRef = adminDb.collection("projects").doc();
    await docRef.set({
      id: docRef.id,
      name: validated.name,
      description: validated.description || null,
      status: validated.status,
      clientId: validated.clientId || null,
      clientName,
      managerId: validated.managerId,
      managerName,
      teamMembers: validated.teamMembers || [],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/projects");

    await logActivity({
      userId: uid,
      action: "create",
      module: "projects",
      recordId: docRef.id,
      details: { name: validated.name, status: validated.status, managerId: validated.managerId },
    });

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create project.";
    return { success: false, error: msg };
  }
}

export async function updateProjectAction(projectId: string, data: Partial<ProjectInput>) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can edit projects." };
    }

    const validated = projectSchema.partial().parse(data);
    const docRef = adminDb.collection("projects").doc(projectId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Project not found." };

    const updates: Record<string, unknown> = { ...validated, updated_at: FieldValue.serverTimestamp() };

    // Re-resolve client name if clientId changed
    if (validated.clientId) {
      const clientDoc = await adminDb.collection("customers").doc(validated.clientId).get();
      updates.clientName = clientDoc.exists ? clientDoc.data()?.name || null : null;
    }
    // Re-resolve manager name if managerId changed
    if (validated.managerId) {
      const managerDoc = await adminDb.collection("profiles").doc(validated.managerId).get();
      const m = managerDoc.exists ? managerDoc.data()! : null;
      updates.managerName = m ? m.full_name || m.email || null : null;
    }

    await docRef.update(updates);

    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${projectId}`);

    await logActivity({
      userId: uid,
      action: "update",
      module: "projects",
      recordId: projectId,
      details: { ...validated },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update project.";
    return { success: false, error: msg };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can delete projects." };
    }

    const docRef = adminDb.collection("projects").doc(projectId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Project not found." };

    // Delete all tasks for this project first
    const tasks = await adminDb.collection("tasks").where("projectId", "==", projectId).get();
    const batch = adminDb.batch();
    tasks.docs.forEach((t) => batch.delete(t.ref));
    batch.delete(docRef);
    await batch.commit();

    revalidatePath("/dashboard/projects");

    await logActivity({
      userId: uid,
      action: "delete",
      module: "projects",
      recordId: projectId,
      details: { name: doc.data()?.name },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete project.";
    return { success: false, error: msg };
  }
}