"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, where, type Query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Search, Loader2, CheckCircle, XCircle, Clock, Trash2, FileText, Package, Truck, Eye } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { SalesOrder, PurchaseOrder, OrderStatus } from "@/types";
import { updateOrderStatusAction } from "@/app/actions/orders";
import { toast } from "sonner";

export default function OrderList() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [userRole, setUserRole] = useState<string>("employee");
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const searchParams = useSearchParams();

  // Simple auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const profileSnap = await getDoc(doc(db, "profiles", user.uid));
          if (profileSnap.exists()) {
            setUserRole(profileSnap.data().role || "employee");
          }
        } catch {
          // ignore
        }
      } else {
        setUid(null);
        setUserRole("anonymous");
      }
    });
    return () => unsub();
  }, []);

  // Initialize status filter from URL
  const initialStatus = searchParams.get("status") as OrderStatus | "";

  // Fetch Sales Orders
  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    let q: Query;
    if (userRole === "admin" || userRole === "manager") {
      q = collection(db, "salesOrders");
    } else {
      q = query(collection(db, "salesOrders"), where("createdBy", "==", uid));
    }
    if (statusFilter) {
      q = query(q, where("status", "==", statusFilter));
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: SalesOrder[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            orderNumber: data.orderNumber,
            customerId: data.customerId,
            customerName: data.customerName || "Unknown",
            items: data.items || [],
            total: data.total || 0,
            status: data.status || "pending",
            createdBy: data.createdBy,
            createdByName: data.createdByName || "Unknown",
            created_at: data.created_at?.toDate()?.toISOString() || "",
          } as SalesOrder);
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSalesOrders(list);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid, userRole, statusFilter]);

  // Fetch Purchase Orders
  useEffect(() => {
    if (!uid) return;

    let q: Query;
    if (userRole === "admin" || userRole === "manager") {
      q = collection(db, "purchaseOrders");
    } else {
      q = query(collection(db, "purchaseOrders"), where("createdBy", "==", uid));
    }
    if (statusFilter) {
      q = query(q, where("status", "==", statusFilter));
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: PurchaseOrder[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            orderNumber: data.orderNumber,
            supplier: data.supplier || "N/A",
            items: data.items || [],
            total: data.total || 0,
            status: data.status || "pending",
            createdBy: data.createdBy,
            createdByName: data.createdByName || "Unknown",
            created_at: data.created_at?.toDate()?.toISOString() || "",
          } as PurchaseOrder);
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPurchaseOrders(list);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid, userRole, statusFilter]);

  const canManage = userRole === "admin" || userRole === "manager";

  // Filter functions
  const filteredSales = salesOrders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(term) ||
      (o.customerName || "").toLowerCase().includes(term) ||
      (o.createdByName || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPurchase = purchaseOrders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(term) ||
      (o.supplier || "").toLowerCase().includes(term) ||
      (o.createdByName || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Orders
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sales and purchase order history.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-lg border border-zinc-300 pl-10 pr-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          {canManage && (
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val as OrderStatus | "");
                router.push(val ? `/dashboard/orders?status=${val}` : "/dashboard/orders");
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* Sales Orders */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {filteredSales.length === 0 ? (
          <div className="flex h-64 items-center justify-center p-6 text-center">
            <Package className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No sales orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Status</th>
                  {canManage && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredSales.map((order) => {
                  const statusColors: Record<OrderStatus, string> = {
                    pending: "bg-zinc-100 text-zinc-700",
                    completed: "bg-green-100 text-green-700",
                    cancelled: "bg-red-100 text-red-700",
                  };
                  const statusBadge = statusColors[order.status] || "bg-zinc-100 text-zinc-700";
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {order.customerName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">₨{order.total}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {order.items.length} items
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full ${statusBadge}`}>
                          {order.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toast.info("View order details — coming soon.")}
                              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {order.status !== "cancelled" && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateOrderStatusAction(order.id, "cancelled");
                                    toast.success("Order cancelled successfully.");
                                  } catch {
                                    toast.error("Failed to cancel order.");
                                  }
                                }}
                                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-red-400"
                                title="Cancel"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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

      {/* Purchase Orders */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 mt-6">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Purchase Orders</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Restocking orders.
          </p>
        </div>
        {filteredPurchase.length === 0 ? (
          <div className="flex h-32 items-center justify-center p-6 text-center">
            <Truck className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No purchase orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Status</th>
                  {canManage && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredPurchase.map((order) => {
                  const statusColors: Record<OrderStatus, string> = {
                    pending: "bg-zinc-100 text-zinc-700",
                    completed: "bg-green-100 text-green-700",
                    cancelled: "bg-red-100 text-red-700",
                  };
                  const statusBadge = statusColors[order.status] || "bg-zinc-100 text-zinc-700";
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {order.supplier}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">₨{order.total}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {order.items.length} items
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full ${statusBadge}`}>
                          {order.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status !== "cancelled" && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateOrderStatusAction(order.id, "cancelled");
                                    toast.success("Order cancelled successfully.");
                                  } catch {
                                    toast.error("Failed to cancel order.");
                                  }
                                }}
                                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-red-400"
                                title="Cancel"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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
    </div>
  );
}