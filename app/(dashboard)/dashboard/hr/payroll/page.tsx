import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import SalarySlip from "@/components/finance/SalarySlip";

export const metadata = {
  title: "Payroll | NexGen ERP",
  description: "View payroll records and salary slips.",
};

export default async function HrPayrollPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists || profileSnap.data()?.role !== "hr") {
      redirect("/dashboard");
    }
  } catch {
    redirect("/dashboard");
  }

  return <SalarySlip isAdmin />;
}