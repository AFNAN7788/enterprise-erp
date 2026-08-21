import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import PayrollForm from "@/components/finance/PayrollForm";
import SalarySlip from "@/components/finance/SalarySlip";

export const metadata = {
  title: "Payroll | NexGen ERP",
  description: "Generate payroll and manage salary slips.",
};

export default async function PayrollPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  let role: string | undefined;

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");
    role = profileSnap.data()?.role;
  } catch {
    redirect("/dashboard");
  }

  // Route based on role
  if (role === "admin") redirect("/dashboard/admin/payroll");
  if (role === "hr") redirect("/dashboard/hr/payroll");
  if (role === "employee") redirect("/dashboard/employee/payslips");

  return (
    <div className="space-y-6">
      <PayrollForm />
      <SalarySlip isAdmin />
    </div>
  );
}