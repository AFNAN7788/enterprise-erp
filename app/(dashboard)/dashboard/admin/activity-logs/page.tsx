import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import ActivityLogs from "@/components/admin/ActivityLogs";

export const metadata = {
  title: "Activity Logs | NexGen ERP",
  description: "Admin-only audit trail of all system actions.",
};

export default async function ActivityLogsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    // Admin-only — HR, Manager, Employee cannot access the audit trail
    if (!profileSnap.exists || profileSnap.data()?.role !== "admin") {
      redirect("/dashboard");
    }
  } catch {
    redirect("/dashboard");
  }

  return <ActivityLogs />;
}