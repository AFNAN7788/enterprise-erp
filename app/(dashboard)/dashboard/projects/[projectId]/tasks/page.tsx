import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import TaskBoard from "@/components/projects/TaskBoard";

export const metadata = {
  title: "Task Board | NexGen ERP",
  description: "Kanban task board with drag-and-drop.",
};

export default async function TaskBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");

    const role = profileSnap.data()?.role;
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) redirect("/dashboard/projects");

    // Non-admin/manager can only view projects they're on
    if (role !== "admin" && role !== "manager") {
      const teamMembers = projectDoc.data()?.teamMembers || [];
      if (!teamMembers.includes(decoded.uid)) redirect("/dashboard/projects");
    }
  } catch {
    redirect("/dashboard/projects");
  }

  return <TaskBoard projectId={projectId} />;
}