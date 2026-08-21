import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { z } from "zod";
import type { Product } from "@/types";
import { createProductAction } from "@/app/actions/products";
import SalesOrderForm from "@/components/orders/SalesOrderForm";

export const metadata = {
  title: "New Sales Order | NexGen ERP",
  description: "Create a new sales order with multiple line items.",
};

export default async function NewSalesOrderPage() {
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

  return <SalesOrderForm isEditMode={false} />;
}