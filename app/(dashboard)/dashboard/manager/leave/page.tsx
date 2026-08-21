import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import LeaveList from "@/components/leaves/LeaveList";

export const metadata = {
  title: "Team Leave Requests (Manager) | NexGen ERP",
  description: "Approve or reject leave requests from your team members.",
};

export default async function ManagerLeavePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");

    const role = profileSnap.data()?.role;
    // Only managers and admins can access this page
    if (role !== "admin" && role !== "manager") redirect("/dashboard");
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Team Leave Requests
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Review and action leave requests from your direct team members.
        </p>
      </div>

      {/* Manager sees only their team's leave requests */}
      <LeaveList readOnly={false} />
    </div>
  );
}
