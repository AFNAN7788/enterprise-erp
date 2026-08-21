"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { createPayrollAction } from "@/app/actions/payroll";
import type { Employee } from "@/types";
import { toast } from "sonner";

export default function PayrollForm() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Auth check — only admin/hr can generate payroll
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const profileSnap = await getDoc(doc(db, "profiles", user.uid));
          const role = profileSnap.exists() ? profileSnap.data().role : null;
          setIsAuthorized(role === "admin" || role === "hr");
        } catch {
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
    });
    return () => unsub();
  }, []);

  // Fetch employees
  useEffect(() => {
    if (!isAuthorized) return;

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(query(collection(db, "employees"), where("status", "==", "active")));
        if (cancelled) return;
        const list: Employee[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            profileId: data.profileId || "",
            fullName: data.fullName || "Unknown",
            email: data.email || "",
            phone: data.phone,
            department: data.department || "",
            position: data.position || "",
            status: data.status || "active",
            managerId: data.managerId,
            salary: data.salary,
            hireDate: data.hireDate || "",
            created_at: data.created_at?.toDate()?.toISOString() || "",
            updated_at: data.updated_at?.toDate()?.toISOString() || "",
          });
        });
        list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
        setEmployees(list);
      } catch (err) {
        console.error("Error fetching employees for payroll:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthorized]);

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [bonus, setBonus] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());

  const netSalary = (parseFloat(basicSalary || "0") || 0) 
    + (parseFloat(bonus || "0") || 0) 
    - (parseFloat(deductions || "0") || 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("employeeId", selectedEmployee);
      formData.set("basicSalary", basicSalary);
      formData.set("bonus", bonus);
      formData.set("deductions", deductions);
      formData.set("month", month.toString());
      formData.set("year", year.toString());
      const result = await createPayrollAction(formData);
      if (result.success) {
        toast.success("Payroll generated successfully");
      } else {
        toast.error(result.error || "Failed to generate payroll.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmp = employees.find((e) => e.profileId === selectedEmployee || e.id === selectedEmployee);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {!isAuthorized ? (
        <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          You do not have permission to generate payroll.
        </div>
      ) : (
        <>
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Generate Payroll
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Admin-only form for monthly payroll generation per employee.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              required
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.profileId || emp.id}>
                  {emp.fullName} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "Jan" : m === 2 ? "Feb" : m === 3 ? "Mar" : m === 4 ? "Apr" : m === 5 ? "May" : m === 6 ? "Jun" : m === 7 ? "Jul" : m === 8 ? "Aug" : m === 9 ? "Sep" : m === 10 ? "Oct" : m === 11 ? "Nov" : "Dec"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Basic Salary
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Bonus
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Deductions
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Net Salary:</span>
            <span className="ml-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              ₹{netSalary.toFixed(2)}
            </span>
          </div>
        </div>

        {selectedEmp && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Generating for: <span className="font-medium">{selectedEmp.fullName}</span> — {selectedEmp.position} • {selectedEmp.department}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
          >
            Generate Payroll
          </button>
        </div>
          </form>
        </>
      )}
    </div>
  );
}
