import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import CheckInOut from "@/components/attendance/CheckInOut";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";

export const metadata = {
  title: "My Attendance | NexGen ERP",
  description: "View your daily attendance and check-in/check-out history.",
};

export default async function EmployeeAttendancePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");
    // All authenticated users can view their own attendance
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          My Attendance
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Mark your daily attendance and view your monthly history.
        </p>
      </div>

      {/* Check-in / Check-out Widget */}
      <CheckInOut />

      {/* Monthly Calendar */}
      <AttendanceCalendar />
    </div>
  );
}
