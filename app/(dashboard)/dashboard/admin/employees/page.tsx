import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import EmployeeList from "@/components/employees/EmployeeList";

export const metadata = {
  title: "Employee Directory (Admin) | NexGen ERP",
  description: "Manage employee accounts, job roles, and payroll structures.",
};

export default async function AdminEmployeesPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;

  if (!session) {
    redirect("/login");
  }

  try {
    // Decodes token on the server
    const decodedToken = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decodedToken.uid).get();

    if (!profileSnap.exists) {
      redirect("/login");
    }

    const role = profileSnap.data()?.role;
    if (role !== "admin") {
      redirect("/dashboard"); // Redirect to basic dashboard if not Admin
    }
  } catch (err) {
    console.error("Admin Page Auth Error:", err);
    redirect("/dashboard");
  }

  return <EmployeeList defaultReadOnly={false} />;
}
