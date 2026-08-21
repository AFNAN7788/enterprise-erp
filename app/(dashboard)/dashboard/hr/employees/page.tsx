import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import EmployeeList from "@/components/employees/EmployeeList";

export const metadata = {
  title: "Employee Directory (HR) | NexGen ERP",
  description: "View organizational chart and employee records.",
};

export default async function HREmployeesPage() {
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
    // HR view is accessible by both Admin and HR roles
    if (role !== "admin" && role !== "hr") {
      redirect("/dashboard");
    }
  } catch (err) {
    console.error("HR Page Auth Error:", err);
    redirect("/dashboard");
  }

  // HR is granted read-only view
  return <EmployeeList defaultReadOnly={true} />;
}
