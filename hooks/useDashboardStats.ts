"use client";

import { useState, useEffect } from "react";

interface DashboardStatsData {
  stats: {
    totalEmployees: number;
    pendingLeaves: number;
    activeProjects: number;
    lowStockItems: number;
    monthlySales: number;
    monthlyExpenses: number;
    attendanceTrend: { month: string; present: number; late: number }[];
    salesTrend: { month: string; total: number }[];
    expenseByCategory: { category: string; amount: number }[];
    projectStatus: { status: string; count: number }[];
    updated_at: string;
  } | null;
  role: string;
  error?: string;
}

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStatsData>({ stats: null, role: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard-stats", {
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
          const errData = (await res.json()) as { error?: string };
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const result = (await res.json()) as DashboardStatsData;
        if (isMounted) {
          setData(result);
          if (result.error) {
            setError(result.error);
          }
        }
      } catch (err) {
        console.error("Error in useDashboardStats:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return { ...data, loading, error };
}
