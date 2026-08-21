import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import SalarySlip from "@/components/finance/SalarySlip";

export const metadata = {
  title: "My Payslips | NexGen ERP",
  description: "View your salary slips and payroll history.",
};

export default async function EmployeePayslipsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  let uid = "";

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");
    uid = decoded.uid;
  } catch {
    redirect("/dashboard");
  }

  return <SalarySlip employeeId={uid} />;
}