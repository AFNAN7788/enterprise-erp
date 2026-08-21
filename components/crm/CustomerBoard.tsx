"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Plus, Edit2, Trash2, Loader2, User, Building, Phone, Mail } from "lucide-react";
import Link from "next/link";
import type { Customer, CustomerStatus, Profile } from "@/types";
import CustomerForm from "./CustomerForm";
import { deleteCustomerAction, updateCustomerAction } from "@/app/actions/customers";
import { toast } from "sonner";

const COLUMNS: { status: CustomerStatus; label: string; color: string }[] = [
  { status: "lead", label: "Leads", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  { status: "prospect", label: "Prospects", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { status: "active", label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  { status: "inactive", label: "Inactive", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
];

export default function CustomerBoard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const pSnap = await getDoc(doc(db, "profiles", user.uid));
        if (pSnap.exists()) setUserProfile(pSnap.data() as Profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Team members for assignment dropdown (admins only)
  useEffect(() => {
    async function fetchTeam() {
      try {
        const snap = await getDocs(query(collection(db, "profiles")));
        const list = snap.docs.map((d) => ({
          id: d.id,
          fullName: d.data().full_name || d.data().email,
        }));
        setTeamMembers(list);
      } catch (err) {
        console.warn("Error fetching team members:", err);
      }
    }
    fetchTeam();
  }, []);

  // Live customers — non-admins only see their own (enforced by rules + query)
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    setLoading(true);

    let q: any = collection(db, "customers");
    if (userProfile.role !== "admin") {
      q = query(q, where("assignedTo", "==", currentUser.uid));
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Customer[] = [];
        snap.forEach((d: any) => list.push({ id: d.id, ...d.data() } as Customer));
        setCustomers(list);
        setLoading(false);
      } catch (err: any) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentUser, userProfile]);

  const isAdmin = userProfile?.role === "admin";

  async function handleDelete(id: string) {
    setActionLoading(true);
    const res = await deleteCustomerAction(id);
    if (res.success) {
      toast.success("Customer deleted.");
    } else {
      toast.error(res.error || "Failed to delete customer.");
    }
    setDeleteConfirmId(null);
    setActionLoading(false);
  }

  async function handleStatusChange(customerId: string, status: CustomerStatus) {
    const res = await updateCustomerAction(customerId, { status });
    if (res.success) {
      toast.success("Customer status updated.");
    } else {
      toast.error(res.error || "Failed to update status.");
    }
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: customers.filter((c) => c.status === col.status),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Customer Relationship Management
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your sales pipeline and customer interactions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingCustomer(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {grouped.map((col) => (
            <div key={col.status} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs font-medium text-zinc-400">{col.items.length}</span>
              </div>

              <div className="space-y-3">
                {col.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    No customers
                  </p>
                ) : (
                  col.items.map((cust) => (
                    <div key={cust.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/dashboard/crm/${cust.id}`} className="min-w-0">
                          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{cust.name}</p>
                          {cust.company && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                              <Building className="h-3 w-3" /> {cust.company}
                            </p>
                          )}
                        </Link>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditingCustomer(cust); setIsFormOpen(true); }}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-900"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {(cust.email || cust.phone) && (
                        <div className="mt-2 space-y-1 text-xs text-zinc-500">
                          {cust.email && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Mail className="h-3 w-3 shrink-0" /> {cust.email}
                            </p>
                          )}
                          {cust.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0" /> {cust.phone}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <User className="h-3 w-3" />
                          {cust.assignedToName || "Unassigned"}
                        </span>
                        <select
                          value={cust.status}
                          onChange={(e) => handleStatusChange(cust.id, e.target.value as CustomerStatus)}
                          className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-600 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          title="Move to status"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.status} value={c.status}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <CustomerForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
        teamMembers={teamMembers}
        currentUserId={currentUser?.uid ?? ""}
        isAdmin={isAdmin}
      />

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Delete Customer</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This will permanently delete the customer and all their interactions. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={actionLoading}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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