"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function HRRecruitmentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Recruitment
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage recruitment workflows, screen candidates, and coordinate interviews.
        </p>
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <Briefcase className="h-5 w-5 text-[var(--muted-foreground)]" />
            Recruitment
          </CardTitle>
          <CardDescription className="text-[var(--muted-foreground)]">
            HR-driven hiring pipeline management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
            <p className="mt-4 text-sm font-medium text-[var(--card-foreground)]">
              Recruitment features coming soon.
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Post jobs, review applications, and manage the candidate experience.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
