import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import StockEntryForm from "@/components/inventory/StockEntryForm";
import StockMovementsList from "@/components/inventory/StockMovementsList";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Stock Entry | NexGen ERP",
  description: "Record stock-in and stock-out movements.",
};

export default async function StockEntryPage() {
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

  // All authenticated users can view history; editing is gated in the UI/actions
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StockEntryForm />
        <StockMovementsList />
      </div>
    </div>
  );
}