"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function EmployeeTasksPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          My Tasks
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          View and manage your assigned tasks, track progress, and update statuses.
        </p>
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <CheckSquare className="h-5 w-5 text-[var(--muted-foreground)]" />
            My Tasks
          </CardTitle>
          <CardDescription className="text-[var(--muted-foreground)]">
            Your personal task board.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
            <p className="mt-4 text-sm font-medium text-[var(--card-foreground)]">
              Task management features coming soon.
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              View assigned tasks, update progress, and track deadlines.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
