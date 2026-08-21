"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ManagerPerformancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Performance Reviews
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Conduct and manage performance reviews for your direct reports.
        </p>
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <BarChart3 className="h-5 w-5 text-[var(--muted-foreground)]" />
            Performance Reviews
          </CardTitle>
          <CardDescription className="text-[var(--muted-foreground)]">
            Team performance management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
            <p className="mt-4 text-sm font-medium text-[var(--card-foreground)]">
              Performance review features coming soon.
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Evaluate team members, set goals, and provide feedback.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
