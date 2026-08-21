"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, doc, getDoc, getDocs, type Query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Plus, Edit2, Trash2, Loader2, Package, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Product, Profile } from "@/types";
import ProductForm from "./ProductForm";
import { deleteProductAction } from "@/app/actions/products";
import { toast } from "sonner";

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const pSnap = await getDoc(doc(db, "profiles", user.uid));
        if (pSnap.exists()) setUserProfile(pSnap.data() as Profile);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch categories for filter dropdown
  useEffect(() => {
    async function fetchCategories() {
      try {
        const snap = await getDocs(query(collection(db, "products")));
        const cats = Array.from(new Set(snap.docs.map((d) => d.data().category).filter(Boolean)));
        setCategories(cats);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    }
    fetchCategories();
  }, []);

  // Live products with category filter (Firestore query where)
  useEffect(() => {
    let q: Query = collection(db, "products");
    if (selectedCategory) {
      q = query(q, where("category", "==", selectedCategory));
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Product[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
        setProducts(list);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedCategory]);

  const canManage = userProfile?.role === "admin" || userProfile?.role === "manager";

  // Client-side search on name/sku
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  });

  async function handleDelete(id: string) {
    const res = await deleteProductAction(id);
    if (!res.success) {
      toast.error(res.error);
    } else {
      toast.success("Product deleted successfully.");
    }
    setDeleteConfirmId(null);
  }

  const lowStockCount = products.filter((p) => p.quantity < p.reorderLevel).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Inventory
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Products, stock levels, and reorder alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowStockCount} low stock
            </span>
          )}
          {canManage && (
            <Link
              href="/dashboard/inventory/stock"
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Stock Entry
            </Link>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, SKU, or category..."
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Product table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Package className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No products found</p>
            <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Try adjusting your search or category filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Reorder Level</th>
                  <th className="px-6 py-4">Status</th>
                  {canManage && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredProducts.map((product) => {
                  const isLowStock = product.quantity < product.reorderLevel;
                  return (
                    <tr key={product.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{product.name}</p>
                        <p className="text-xs text-zinc-500">
                          {product.sku || "No SKU"}
                          {product.unit ? ` · ${product.unit}` : ""}
                        </p>
                        {product.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{product.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{product.category}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${isLowStock ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{product.reorderLevel}</td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            In Stock
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(product.id)}
                              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProduct(null); }}
        onSuccess={(action) =>
          toast.success(action === "updated" ? "Product updated successfully." : "Product created successfully.")
        }
        product={editingProduct}
        categories={categories}
      />

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Delete Product</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This will permanently delete this product and its stock movements. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}