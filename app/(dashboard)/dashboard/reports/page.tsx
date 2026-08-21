"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Download } from "lucide-react";
import { toast } from "sonner";

interface ReportData {
  employees: { total: number; active: number; inactive: number; departments: Record<string, number> };
  financial: { totalExpenses: number; expensesByCategory: Record<string, number>; totalPayroll: number; netRevenue: number };
  attendance: { total: number; present: number; absent: number; late: number; rate: number };
  projects: { total: number; statuses: Record<string, number> };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (!profileSnap.exists()) {
          setLoading(false);
          return;
        }

        const [employeesSnap, attendanceSnap, expensesSnap, payrollSnap, projectsSnap, salesOrdersSnap, purchaseOrdersSnap] =
          await Promise.all([
            getDocs(collection(db, "employees")),
            getDocs(collection(db, "attendance")),
            getDocs(collection(db, "expenses")),
            getDocs(collection(db, "payroll")),
            getDocs(collection(db, "projects")),
            getDocs(collection(db, "salesOrders")),
            getDocs(collection(db, "purchaseOrders")),
          ]);

        const departments: Record<string, number> = {};
        let activeCount = 0;
        let inactiveCount = 0;
        employeesSnap.forEach((d) => {
          const emp = d.data();
          const dept = emp.department || "Unassigned";
          departments[dept] = (departments[dept] || 0) + 1;
          if (emp.status === "active") activeCount++;
          else inactiveCount++;
        });

        let totalExpenses = 0;
        const expensesByCategory: Record<string, number> = {};
        expensesSnap.forEach((d) => {
          const exp = d.data();
          totalExpenses += exp.amount || 0;
          const cat = exp.category || "Other";
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (exp.amount || 0);
        });

        let totalPayroll = 0;
        payrollSnap.forEach((d) => {
          totalPayroll += d.data().amount || 0;
        });

        let totalSales = 0;
        salesOrdersSnap.forEach((d) => {
          totalSales += d.data().total || 0;
        });

        let totalPurchases = 0;
        purchaseOrdersSnap.forEach((d) => {
          totalPurchases += d.data().total || 0;
        });

        let present = 0;
        let absent = 0;
        let late = 0;
        attendanceSnap.forEach((d) => {
          const status = d.data().status;
          if (status === "present") present++;
          else if (status === "absent") absent++;
          else if (status === "late") late++;
        });

        const statuses: Record<string, number> = {};
        projectsSnap.forEach((d) => {
          const st = d.data().status || "unknown";
          statuses[st] = (statuses[st] || 0) + 1;
        });

        const totalAttendance = present + absent + late;

        setData({
          employees: { total: employeesSnap.size, active: activeCount, inactive: inactiveCount, departments },
          financial: { totalExpenses, expensesByCategory, totalPayroll, netRevenue: totalSales - totalPurchases },
          attendance: { total: totalAttendance, present, absent, late, rate: totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0 },
          projects: { total: projectsSnap.size, statuses },
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Company-wide overview</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Company-wide overview</p>
        </div>
        <Card>
          <CardContent>
            <p className="text-center text-[var(--muted-foreground)] py-12">No data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Company-wide overview</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-[var(--primary)]" />
              Employee Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{fmt(data.employees.total)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total Employees</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{fmt(data.employees.active)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Active</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{fmt(data.employees.inactive)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Inactive</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">By Department</p>
              <div className="space-y-1.5">
                {Object.entries(data.employees.departments)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">{dept}</span>
                      <span className="font-medium text-[var(--foreground)]">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-[var(--primary)]" />
              Financial Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Total Expenses</p>
                <p className="text-xl font-bold text-[var(--foreground)]">${fmt(data.financial.totalExpenses)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">Total Payroll</p>
                <p className="text-xl font-bold text-[var(--foreground)]">${fmt(data.financial.totalPayroll)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--muted-foreground)]">Net Revenue</p>
              <p className={`text-xl font-bold ${data.financial.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${fmt(data.financial.netRevenue)}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Expenses by Category</p>
              <div className="space-y-1.5">
                {Object.entries(data.financial.expensesByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">{cat}</span>
                      <span className="font-medium text-[var(--foreground)]">${fmt(amount)}</span>
                    </div>
                  ))}
                {Object.keys(data.financial.expensesByCategory).length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]">No expenses recorded</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-[var(--primary)]" />
              Attendance Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{fmt(data.attendance.total)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total Records</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--primary)]">{data.attendance.rate}%</p>
                <p className="text-xs text-[var(--muted-foreground)]">Attendance Rate</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-xl font-bold text-green-600">{fmt(data.attendance.present)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Present</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-xl font-bold text-red-600">{fmt(data.attendance.absent)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Absent</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3 text-center">
                <p className="text-xl font-bold text-yellow-600">{fmt(data.attendance.late)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              Project Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[var(--border)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">{fmt(data.projects.total)}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total Projects</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">By Status</p>
              <div className="space-y-1.5">
                {Object.entries(data.projects.statuses)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-[var(--muted-foreground)]">{status.replace("_", " ")}</span>
                      <span className="font-medium text-[var(--foreground)]">{count}</span>
                    </div>
                  ))}
                {Object.keys(data.projects.statuses).length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]">No projects found</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
