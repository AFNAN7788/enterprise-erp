"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, where, type Query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Search, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { createExpenseAction, updateExpenseStatusAction } from "@/app/actions/expenses";
import type { Expense } from "@/types";
import { toast } from "sonner";

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userRole, setUserRole] = useState<string>("employee");
  const [uid, setUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
        setUserRole("employee");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    let q: Query;
    if (userRole === "admin" || userRole === "hr") {
      q = query(collection(db, "expenses"));
    } else {
      q = query(
        collection(db, "expenses"),
        where("submittedBy", "==", uid)
      );
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Expense[] = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          list.push({
            id: d.id,
            category: (data.category as string) || "",
            amount: (data.amount as number) || 0,
            submittedBy: (data.submittedBy as string) || "",
            submittedByName: (data.submittedByName as string) || "Unknown",
            approvalStatus: (data.approvalStatus as Expense["approvalStatus"]) || "pending",
            created_at: data.created_at instanceof Object && typeof (data.created_at as { toDate?: () => Date }).toDate === "function"
              ? (data.created_at as { toDate: () => Date }).toDate().toISOString()
              : (data.created_at as string) || "",
            updated_at: data.updated_at instanceof Object && typeof (data.updated_at as { toDate?: () => Date }).toDate === "function"
              ? (data.updated_at as { toDate: () => Date }).toDate().toISOString()
              : (data.updated_at as string) || "",
          });
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setExpenses(list);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid, userRole]);

  const handleStatusUpdate = async (expenseId: string, status: "approved" | "rejected") => {
    try {
      await updateExpenseStatusAction(expenseId, status);
      toast.success(`Expense ${status} successfully`);
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? { ...e, approvalStatus: status } : e))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const filtered = expenses.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.category.toLowerCase().includes(term) ||
      (e.submittedByName || "").toLowerCase().includes(term)
    );
  });

  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await createExpenseAction(formData);
      toast.success("Expense submitted successfully");
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit expense.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Expenses</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Submit expenses and track approval status.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Category
            </label>
            <input
              name="category"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="e.g., Travel, Office Supplies"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="0.00"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
          >
            Submit
          </button>
        </form>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by category or submitter..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 pl-10 pr-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {filtered.length === 0 ? (
          <div className="flex h-48 items-center justify-center p-6 text-center">
            <div className="text-center">
              <Plus className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                No expenses found
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Submitted By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  {(userRole === "admin" || userRole === "hr") && <th className="px-6 py-4">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((expense) => (
                  <tr key={expense.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                      {expense.category}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        &#8377;{expense.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {expense.submittedByName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[expense.approvalStatus]}`}
                      >
                        {expense.approvalStatus === "pending" && <Clock className="h-3 w-3" />}
                        {expense.approvalStatus === "approved" && <CheckCircle className="h-3 w-3" />}
                        {expense.approvalStatus === "rejected" && <XCircle className="h-3 w-3" />}
                        {expense.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {new Date(expense.created_at).toLocaleDateString()}
                    </td>
                    {(userRole === "admin" || userRole === "hr") && (
                      <td className="px-6 py-4">
                        {expense.approvalStatus === "pending" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(expense.id, "approved")}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(expense.id, "rejected")}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">&mdash;</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
