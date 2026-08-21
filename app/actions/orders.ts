"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";
import type { OrderStatus } from "@/types";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string().min(1, "Product name is required."),
  quantity: z.coerce.number().positive("Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more."),
});

const salesOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item is required."),
});

const purchaseOrderSchema = z.object({
  supplier: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item is required."),
});

type OrderItemForm = z.infer<typeof orderItemSchema>;
type SalesOrderInput = z.infer<typeof salesOrderSchema>;
type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) throw new Error("Authentication required.");

  const decoded = await adminAuth.verifyIdToken(session);
  const profileSnap = await adminDb.collection("profiles").doc(decoded.uid).get();
  if (!profileSnap.exists) throw new Error("User profile not found.");

  return { uid: decoded.uid, profile: profileSnap.data()! };
}

async function verifyAdminOrManager(uid: string): Promise<boolean> {
  const profileSnap = await adminDb.collection("profiles").doc(uid).get();
  const role = profileSnap.exists ? profileSnap.data()?.role : null;
  return role === "admin" || role === "manager";
}

// ─── Products Stock helpers ──────────────────────────────────────────────────

async function getProductsForOrder(productIds: string[]) {
  const products: Record<string, { name: string }> = {};
  for (const pid of productIds) {
    const doc = await adminDb.collection("products").doc(pid).get();
    if (doc.exists) {
      products[pid] = { name: doc.data()?.name || "Unknown" };
    }
  }
  return products;
}

// ─── Sales Order: Create with Stock Transaction ───────────────────────────────

export async function createSalesOrderAction(data: SalesOrderInput) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can create sales orders." };
    }

    const validated = salesOrderSchema.parse(data);
    const { items } = validated;

    // Get product names
    const productIds = items.map((i) => i.productId);
    const productNames = await getProductsForOrder(productIds);

    // Compute line totals
    const processedItems = items.map((item) => ({
      productId: item.productId,
      productName: productNames[item.productId]?.name || item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    // Firestore transaction: create sales order + reduce stock atomically
    const orderNumber = `SO-${Date.now()}`;
    const total = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    await adminDb.runTransaction(async (transaction) => {
      // 1. Create sales order document
      const orderRef = adminDb.collection("salesOrders").doc();

      transaction.set(orderRef, {
        id: orderRef.id,
        orderNumber,
        customerId: validated.customerId || null,
        items: processedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        total,
        status: "pending" as OrderStatus,
        createdBy: uid,
        createdByName: (await adminDb.collection("profiles").doc(uid).get()).data()?.full_name || "Unknown",
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // 2. Reduce product stock atomically
      for (const item of processedItems) {
        const stock = await adminDb.collection("products").doc(item.productId).get();
        const currentQty = stock.data()?.quantity || 0;
        transaction.update(adminDb.collection("products").doc(item.productId), {
          quantity: currentQty - item.quantity,
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/inventory");

    await logActivity({
      userId: uid,
      action: "create",
      module: "sales",
      recordId: orderNumber,
      details: { type: "sales", total, items: processedItems.length },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create sales order.";
    return { success: false, error: msg };
  }
}

// ─── Purchase Order: Create with Stock Transaction ────────────────────────────

export async function createPurchaseOrderAction(data: PurchaseOrderInput) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can create purchase orders." };
    }

    const validated = purchaseOrderSchema.parse(data);

    // Compute line totals
    const processedItems = validated.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    // Firestore transaction: create purchase order + increase stock atomically
    const orderNumber = `PO-${Date.now()}`;
    const total = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    await adminDb.runTransaction(async (transaction) => {
      // 1. Create purchase order document
      const orderRef = adminDb.collection("purchaseOrders").doc();

      transaction.set(orderRef, {
        id: orderRef.id,
        orderNumber,
        supplier: validated.supplier || null,
        items: processedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        total,
        status: "pending" as OrderStatus,
        createdBy: uid,
        createdByName: (await adminDb.collection("profiles").doc(uid).get()).data()?.full_name || "Unknown",
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // 2. Increase product stock atomically
      for (const item of processedItems) {
        transaction.update(adminDb.collection("products").doc(item.productId), {
          quantity: FieldValue.increment(item.quantity),
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    });

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/inventory");

    await logActivity({
      userId: uid,
      action: "create",
      module: "sales",
      recordId: orderNumber,
      details: { type: "purchase", total, items: processedItems.length },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create purchase order.";
    return { success: false, error: msg };
  }
}

// ─── Update Order Status ──────────────────────────────────────────────────────

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized." };
    }

    const orderRef = adminDb.collection("salesOrders").doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return { success: false, error: "Sales order not found." };

    await orderRef.update({ status, updated_at: FieldValue.serverTimestamp() });
    revalidatePath("/dashboard/orders");

    await logActivity({
      userId: uid,
      action: "status",
      module: "sales",
      recordId: orderId,
      details: { orderNumber: orderDoc.data()?.orderNumber, status },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update order status.";
    return { success: false, error: msg };
  }
}