import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import DocumentsClient from "./DocumentsClient";

export const metadata = {
  title: "Documents | NexGen ERP",
  description: "Upload, manage, and download documents.",
};

export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) redirect("/login");

  let role = "employee";

  try {
    const decoded = await adminAuth.verifyIdToken(session);
    const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
    if (!profileSnap.exists) redirect("/login");
    role = profileSnap.data()?.role || "employee";
  } catch {
    redirect("/dashboard");
  }

  return <DocumentsClient role={role} />;
}
