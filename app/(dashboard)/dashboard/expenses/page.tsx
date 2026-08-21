import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import ExpenseList from "@/components/finance/ExpenseList";

export const metadata = {
  title: "Expenses | NexGen ERP",
  description: "Submit and track expense approvals.",
};

export default async function ExpensesPage() {
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

  return <ExpenseList />;
}