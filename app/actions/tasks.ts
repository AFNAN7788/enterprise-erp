"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";
import type { TaskStatus } from "@/types";

const taskSchema = z.object({
  projectId: z.string().min(1, "Project is required."),
  title: z.string().min(1, "Task title is required."),
  description: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type TaskInput = z.infer<typeof taskSchema>;

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

async function resolveAssigneeName(assigneeId?: string | null): Promise<string | null> {
  if (!assigneeId) return null;
  const doc = await adminDb.collection("profiles").doc(assigneeId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return d.full_name || d.email || null;
}

export async function createTaskAction(data: TaskInput) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can create tasks." };
    }

    const validated = taskSchema.parse(data);
    const assigneeName = await resolveAssigneeName(validated.assigneeId);

    const docRef = adminDb.collection("tasks").doc();
    await docRef.set({
      id: docRef.id,
      projectId: validated.projectId,
      title: validated.title,
      description: validated.description || null,
      status: validated.status,
      assigneeId: validated.assigneeId || null,
      assigneeName,
      dueDate: validated.dueDate || null,
      priority: validated.priority,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Notify the assignee that a task was assigned to them
    if (validated.assigneeId) {
      await createNotification({
        userId: validated.assigneeId,
        title: "Task Assigned",
        message: `You have been assigned the task "${validated.title}"${validated.dueDate ? ` (due ${validated.dueDate})` : ""}.`,
        type: "task",
        link: `/dashboard/projects/${validated.projectId}/tasks`,
      });
    }

    revalidatePath(`/dashboard/projects/${validated.projectId}`);
    revalidatePath(`/dashboard/projects/${validated.projectId}/tasks`);

    await logActivity({
      userId: uid,
      action: "create",
      module: "tasks",
      recordId: docRef.id,
      details: { title: validated.title, projectId: validated.projectId, assigneeId: validated.assigneeId },
    });

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create task.";
    return { success: false, error: msg };
  }
}

export async function updateTaskAction(taskId: string, data: Partial<TaskInput>) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can edit tasks." };
    }

    const validated = taskSchema.partial().parse(data);
    const docRef = adminDb.collection("tasks").doc(taskId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Task not found." };

    const updates: Record<string, unknown> = { ...validated, updated_at: FieldValue.serverTimestamp() };
    if (validated.assigneeId !== undefined) {
      updates.assigneeName = await resolveAssigneeName(validated.assigneeId);
    }

    const projectId = validated.projectId || doc.data()!.projectId;
    await docRef.update(updates);

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks`);

    await logActivity({
      userId: uid,
      action: "update",
      module: "tasks",
      recordId: taskId,
      details: { ...validated },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update task.";
    return { success: false, error: msg };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can delete tasks." };
    }

    const docRef = adminDb.collection("tasks").doc(taskId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Task not found." };

    const projectId = doc.data()!.projectId;
    await docRef.delete();

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/tasks`);

    await logActivity({
      userId: uid,
      action: "delete",
      module: "tasks",
      recordId: taskId,
      details: { title: doc.data()?.title, projectId },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete task.";
    return { success: false, error: msg };
  }
}

/**
 * Update task status — allowed for Admin/Manager (any task) and
 * the assigned employee (their own task only).
 */
export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    const role = profile.role as string;

    const docRef = adminDb.collection("tasks").doc(taskId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Task not found." };

    const task = doc.data()!;
    const isAdminOrManager = role === "admin" || role === "manager";
    const isAssignee = task.assigneeId === uid;

    if (!isAdminOrManager && !isAssignee) {
      return { success: false, error: "Unauthorized. You can only update your own tasks." };
    }

    await docRef.update({
      status,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/dashboard/projects/${task.projectId}`);
    revalidatePath(`/dashboard/projects/${task.projectId}/tasks`);

    await logActivity({
      userId: uid,
      action: "status",
      module: "tasks",
      recordId: taskId,
      details: { title: task.title, status },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update task status.";
    return { success: false, error: msg };
  }
}