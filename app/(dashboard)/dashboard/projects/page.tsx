import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import ProjectList from "@/components/projects/ProjectList";

export const metadata = {
  title: "Projects | NexGen ERP",
  description: "Manage projects, linked clients, and team tasks.",
};

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");
  } catch {
    redirect("/dashboard");
  }

  return <ProjectList />;
}