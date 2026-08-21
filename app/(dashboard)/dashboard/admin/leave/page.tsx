"use client";

import LeaveList from "@/components/leaves/LeaveList";

export default function AdminLeavePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Leave Management
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Review, approve, or reject employee leave requests across the organization.
        </p>
      </div>

      <LeaveList readOnly={false} />
    </div>
  );
}
