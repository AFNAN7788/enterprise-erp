"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { FileText, Printer } from "lucide-react";
import type { Payroll } from "@/types";

interface SalarySlipProps {
  employeeId?: string;
  isAdmin?: boolean;
}

export default function SalarySlip({ employeeId, isAdmin = false }: SalarySlipProps) {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [uid, setUid] = useState<string | null>(null);

  // Get current user name for display
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setUserName(user.displayName || user.email || "");
      } else {
        setUid(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch payroll records (admin sees all, employee sees own)
  useEffect(() => {
    if (!uid && !isAdmin) { setLoading(false); return; }

    const q = query(collection(db, "payroll"), orderBy("year", "desc"), orderBy("month", "desc"));
    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Payroll[] = [];
        snap.forEach((d) => {
          const data = d.data();
          // Admin sees all; employee sees only their own records
          const targetId = employeeId || uid;
          if (isAdmin || !targetId || data.employeeId === targetId) {
            list.push({
              id: d.id,
              employeeId: data.employeeId || "",
              employeeName: data.employeeName || data.employeeName || "Unknown",
              basicSalary: data.basicSalary || 0,
              bonus: data.bonus || 0,
              deductions: data.deductions || 0,
              netSalary: data.netSalary || 0,
              month: data.month || 1,
              year: data.year || new Date().getFullYear(),
              created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || "",
              updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at || "",
            });
          }
        });
        setRecords(list);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid, employeeId, isAdmin]);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const formatMoney = (n: number) => `₹${Number(n).toFixed(2)}`;

  // For the selected record (latest) show a detailed slip; list the rest as history
  const selected = records[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Salary Slips</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isAdmin ? "All payroll records" : "Your payroll history"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          Loading...
        </div>
      ) : records.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <FileText className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No salary slips found</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Generated payroll records will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Detailed slip */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">NexGen ERP</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Payslip — {monthNames[selected.month - 1]} {selected.year}</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {monthNames[selected.month - 1]} {selected.year}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Employee</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {selected.employeeName || userName || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Basic Salary</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatMoney(selected.basicSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Bonus</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatMoney(selected.bonus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Deductions</span>
                <span className="font-medium text-red-600 dark:text-red-400">- {formatMoney(selected.deductions)}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Net Salary</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{formatMoney(selected.netSalary)}</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Payslip History
            </h3>
            <ul className="space-y-3">
              {records.map((rec) => (
                <li
                  key={rec.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="text-zinc-700 dark:text-zinc-200">
                    {monthNames[rec.month - 1]} {rec.year}
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatMoney(rec.netSalary)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}