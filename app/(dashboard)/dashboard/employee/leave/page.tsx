import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import LeaveRequestForm from "@/components/leaves/LeaveRequestForm";
import LeaveList from "@/components/leaves/LeaveList";

export const metadata = {
  title: "My Leave Requests | NexGen ERP",
  description: "Submit and track your leave requests.",
};

export default async function EmployeeLeavePage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Leave Requests
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Apply for leave and track the status of your requests.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Apply form */}
        <LeaveRequestForm />

        {/* Right: My requests (read-only for employee) */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            My Requests
          </h2>
          {/* readOnly=true — employee cannot approve/reject their own requests */}
          <LeaveList readOnly={true} />
        </div>
      </div>
    </div>
  );
}
