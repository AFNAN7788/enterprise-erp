"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { Product, Profile } from "@/types";
import { recordStockMovementAction } from "@/app/actions/products";
import { toast } from "sonner";

export default function StockEntryForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  // Auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const pSnap = await getDoc(doc(db, "profiles", user.uid));
        if (pSnap.exists()) setUserProfile(pSnap.data() as Profile);
      }
    });
    return () => unsub();
  }, []);

  // Live products for dropdown
  useEffect(() => {
    const q = query(collection(db, "products"));
    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Product[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
        setProducts(list);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const canManage = userProfile?.role === "admin" || userProfile?.role === "manager";
  const selectedProduct = products.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!productId) {
      toast.error("Please select a product.");
      return;
    }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    setSubmitting(true);
    const res = await recordStockMovementAction({ productId, type, quantity: qty, reason: reason.trim() || null });
    if (res.success) {
      toast.success(type === "in" ? "Stock-in recorded successfully." : "Stock-out recorded successfully.");
      setQuantity("");
      setReason("");
    } else {
      toast.error(res.error || "Failed to record stock movement.");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Stock Entry</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Record stock-in or stock-out. Updates the movement log and product quantity atomically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {/* Product Select */}
        <div>
          <label htmlFor="productId" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Product *
          </label>
          <select
            id="productId"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            disabled={!canManage}
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.quantity} {p.unit || "units"} in stock
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p className="mt-1 text-xs text-zinc-500">
              Current quantity: <strong>{selectedProduct.quantity} {selectedProduct.unit || "pcs"}</strong> · Reorder level: {selectedProduct.reorderLevel}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Movement Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("in")}
              disabled={!canManage}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                type === "in"
                  ? "bg-green-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Stock In
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              disabled={!canManage}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                type === "out"
                  ? "bg-red-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Stock Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="quantity" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Quantity *
            </label>
            <input
              id="quantity"
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              disabled={!canManage}
              placeholder="e.g. 10"
            />
          </div>

          <div>
            <label htmlFor="reason" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Reason
            </label>
            <input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              disabled={!canManage}
              placeholder="e.g. Purchase order #123, Damaged goods"
            />
          </div>
        </div>

        {!canManage && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
            Only Admin and Manager roles can record stock movements.
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canManage || submitting}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Record Movement
          </button>
        </div>
      </form>
    </div>
  );
}