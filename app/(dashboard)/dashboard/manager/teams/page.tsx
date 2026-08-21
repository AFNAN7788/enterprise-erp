"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ManagerTeamsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Team Overview
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          View your team members, their roles, and current workload.
        </p>
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
            Team Overview
          </CardTitle>
          <CardDescription className="text-[var(--muted-foreground)]">
            Your team at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
            <p className="mt-4 text-sm font-medium text-[var(--card-foreground)]">
              Team overview features coming soon.
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Monitor team availability, assignments, and performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
