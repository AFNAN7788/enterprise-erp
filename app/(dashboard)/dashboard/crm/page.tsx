import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import CustomerBoard from "@/components/crm/CustomerBoard";

export const metadata = {
  title: "CRM | NexGen ERP",
  description: "Manage customers, pipeline, and interactions.",
};

export default async function CRMPage() {
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

  return <CustomerBoard />;
}