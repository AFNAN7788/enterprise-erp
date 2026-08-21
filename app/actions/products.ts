"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activityLogs";
import { z } from "zod";
import type { StockMovementType } from "@/types";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required."),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or more."),
  unit: z.string().optional().nullable(),
  reorderLevel: z.coerce.number().min(0, "Reorder level must be 0 or more."),
});

type ProductInput = z.infer<typeof productSchema>;

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

// ─── Product CRUD (Admin/Manager only) ───────────────────────────────────────

export async function createProductAction(data: ProductInput) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can add products." };
    }

    const validated = productSchema.parse(data);
    const docRef = adminDb.collection("products").doc();
    await docRef.set({
      id: docRef.id,
      name: validated.name,
      sku: validated.sku || null,
      description: validated.description || null,
      category: validated.category,
      quantity: validated.quantity,
      unit: validated.unit || null,
      reorderLevel: validated.reorderLevel,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/stock");

    await logActivity({
      userId: uid,
      action: "create",
      module: "inventory",
      recordId: docRef.id,
      details: { name: validated.name, category: validated.category, quantity: validated.quantity },
    });

    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create product.";
    return { success: false, error: msg };
  }
}

export async function updateProductAction(productId: string, data: Partial<ProductInput>) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can edit products." };
    }

    const validated = productSchema.partial().parse(data);
    const docRef = adminDb.collection("products").doc(productId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Product not found." };

    await docRef.update({ ...validated, updated_at: FieldValue.serverTimestamp() });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/stock");

    await logActivity({
      userId: uid,
      action: "update",
      module: "inventory",
      recordId: productId,
      details: { ...validated },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update product.";
    return { success: false, error: msg };
  }
}

export async function deleteProductAction(productId: string) {
  try {
    const { uid } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can delete products." };
    }

    const docRef = adminDb.collection("products").doc(productId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: "Product not found." };

    // Delete related stock movements too
    const movements = await adminDb.collection("stockMovements").where("productId", "==", productId).get();
    const batch = adminDb.batch();
    movements.docs.forEach((m) => batch.delete(m.ref));
    batch.delete(docRef);
    await batch.commit();

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/stock");

    await logActivity({
      userId: uid,
      action: "delete",
      module: "inventory",
      recordId: productId,
      details: { name: doc.data()?.name },
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete product.";
    return { success: false, error: msg };
  }
}

// ─── Stock Movement (transaction — atomic) ────────────────────────────────────

const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().positive("Quantity must be greater than 0."),
  reason: z.string().optional().nullable(),
});

type StockMovementInput = z.infer<typeof stockMovementSchema>;

export async function recordStockMovementAction(data: StockMovementInput) {
  try {
    const { uid, profile } = await getAuthenticatedUser();
    if (!(await verifyAdminOrManager(uid))) {
      return { success: false, error: "Unauthorized. Only Admin or Manager can record stock movements." };
    }

    const validated = stockMovementSchema.parse(data);
    const productRef = adminDb.collection("products").doc(validated.productId);

    // Firestore transaction — stockMovement + product quantity update atomic:
    // dono succeed ya dono fail; doosri reads/writes beech mein interfere nahi kar sakti.
    await adminDb.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists) {
        throw new Error("Product not found.");
      }

      const currentQuantity = productDoc.data()?.quantity ?? 0;
      const delta = validated.type === "in" ? validated.quantity : -validated.quantity;
      const newQuantity = currentQuantity + delta;

      // Prevent negative stock
      if (newQuantity < 0) {
        throw new Error(`Insufficient stock. Current: ${currentQuantity}, requested out: ${validated.quantity}.`);
      }

      // 1. Write stockMovement document
      const movementRef = adminDb.collection("stockMovements").doc();
      transaction.set(movementRef, {
        id: movementRef.id,
        productId: validated.productId,
        type: validated.type,
        quantity: validated.quantity,
        reason: validated.reason || null,
        createdByName: profile.full_name || profile.email,
        created_at: FieldValue.serverTimestamp(),
      });

      // 2. Update product quantity atomically
      transaction.update(productRef, {
        quantity: newQuantity,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/stock");

    await logActivity({
      userId: uid,
      action: "create",
      module: "inventory",
      recordId: validated.productId,
      details: { type: validated.type, quantity: validated.quantity, reason: validated.reason },
    });

    return { success: true, newQuantity: undefined };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record stock movement.";
    return { success: false, error: msg };
  }
}