import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import LeaveList from "@/components/leaves/LeaveList";

export const metadata = {
  title: "Leave Management (HR) | NexGen ERP",
  description: "Review and approve employee leave requests.",
};

export default async function HRLeavePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");

    const role = profileSnap.data()?.role;
    if (role !== "admin" && role !== "hr") redirect("/dashboard");
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Leave Management
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Review, approve, or reject employee leave requests across the organization.
        </p>
      </div>

      {/* HR sees all leave requests with approve/reject controls */}
      <LeaveList readOnly={false} />
    </div>
  );
}
