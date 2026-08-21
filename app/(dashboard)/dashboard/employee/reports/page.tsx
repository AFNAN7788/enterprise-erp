"use client";

import SummaryCards from "@/components/dashboard/SummaryCards";
import ChartsSection from "@/components/dashboard/ChartsSection";

export default function EmployeeReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--card-foreground)]">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Personal overview — employee view
        </p>
      </div>
      <SummaryCards />
      <ChartsSection />
    </div>
  );
}
