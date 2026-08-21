import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import ProductList from "@/components/inventory/ProductList";

export const metadata = {
  title: "Inventory | NexGen ERP",
  description: "Products, stock levels, and reorder alerts.",
};

export default async function InventoryPage() {
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

  return <ProductList />;
}