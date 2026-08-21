"use client";

import SummaryCards from "@/components/dashboard/SummaryCards";
import ChartsSection from "@/components/dashboard/ChartsSection";

export default function ManagerReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Team overview — manager view
        </p>
      </div>
      <SummaryCards />
      <ChartsSection />
    </div>
  );
}
