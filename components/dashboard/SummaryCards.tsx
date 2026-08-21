"use client";

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Card } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SummaryCards() {
  const { stats, role, loading } = useDashboardStats();

  const s = stats ?? {
    totalEmployees: 0,
    pendingLeaves: 0,
    activeProjects: 0,
    lowStockItems: 0,
    monthlySales: 0,
    monthlyExpenses: 0,
  };

  const cards = role === "admin"
    ? [
        { label: "Total Employees", value: s.totalEmployees, bg: "bg-primary/10" },
        { label: "Pending Leaves", value: s.pendingLeaves, bg: "bg-amber-50 dark:bg-amber-950" },
        { label: "Active Projects", value: s.activeProjects, bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Low Stock Items", value: s.lowStockItems, bg: "bg-red-50 dark:bg-red-950" },
        { label: "Monthly Sales", value: `$${s.monthlySales.toLocaleString()}`, bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Monthly Expenses", value: `$${s.monthlyExpenses.toLocaleString()}`, bg: "bg-orange-50 dark:bg-orange-950" },
      ]
    : role === "manager"
    ? [
        { label: "Team Members", value: s.totalEmployees, bg: "bg-primary/10" },
        { label: "Pending Leaves", value: s.pendingLeaves, bg: "bg-amber-50 dark:bg-amber-950" },
        { label: "Active Projects", value: s.activeProjects, bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Low Stock Items", value: s.lowStockItems, bg: "bg-red-50 dark:bg-red-950" },
        { label: "Team Monthly Sales", value: `$${s.monthlySales.toLocaleString()}`, bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Team Monthly Expenses", value: `$${s.monthlyExpenses.toLocaleString()}`, bg: "bg-orange-50 dark:bg-orange-950" },
      ]
    : [
        { label: "Your Pending Leaves", value: s.pendingLeaves, bg: "bg-amber-50 dark:bg-amber-950" },
        { label: "Your Active Projects", value: s.activeProjects, bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Your Monthly Expenses", value: `$${s.monthlyExpenses.toLocaleString()}`, bg: "bg-orange-50 dark:bg-orange-950" },
        { label: "Your Monthly Salary", value: `$${s.monthlySales.toLocaleString()}`, bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Attendance Trend", value: "—", bg: "bg-blue-50 dark:bg-blue-950" },
        { label: "—", value: "—", bg: "bg-gray-50 dark:bg-gray-950" },
      ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="h-48 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <Card
          key={i}
          className={cn("h-48 flex flex-col items-center justify-center pt-2", card.bg)}
        >
          <Shield className="h-6 w-6 mb-2 text-zinc-400" />
          <span className="text-xs uppercase tracking-wider text-zinc-500">{card.label}</span>
          <span className="mt-1 text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
          </span>
        </Card>
      ))}
    </div>
  );
}
