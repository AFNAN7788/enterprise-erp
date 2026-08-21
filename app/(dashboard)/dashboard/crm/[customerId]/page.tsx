import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import CustomerDetail from "@/components/crm/CustomerDetail";

export const metadata = {
  title: "Customer Details | NexGen ERP",
  description: "View customer details and interaction history.",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");

    const role = profileSnap.data()?.role;
    const customerDoc = await adminDb.collection("customers").doc(customerId).get();
    if (!customerDoc.exists) redirect("/dashboard/crm");

    // Non-admins can only view their own customers
    if (role !== "admin" && customerDoc.data()?.assignedTo !== decoded.uid) {
      redirect("/dashboard/crm");
    }
  } catch {
    redirect("/dashboard/crm");
  }

  return <CustomerDetail customerId={customerId} />;
}