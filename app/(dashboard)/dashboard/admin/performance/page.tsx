"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Target, Star, Award, BarChart3, Users } from "lucide-react";

const summaryCards = [
  {
    title: "Average Performance Score",
    value: "4.2 / 5",
    icon: TrendingUp,
    description: "Across all departments",
    color: "text-emerald-500",
  },
  {
    title: "Top Performers",
    value: "12",
    icon: Award,
    description: "Score 4.5 or above",
    color: "text-amber-500",
  },
  {
    title: "Reviews Pending",
    value: "8",
    icon: Target,
    description: "Awaiting manager input",
    color: "text-rose-500",
  },
  {
    title: "Goals Completed",
    value: "87%",
    icon: Star,
    description: "Organization-wide",
    color: "text-blue-500",
  },
];

const employees = [
  { name: "Alice Johnson", department: "Engineering", score: 4.8, status: "Excellent", lastReview: "2026-07-15" },
  { name: "Bob Martinez", department: "Sales", score: 4.6, status: "Excellent", lastReview: "2026-07-10" },
  { name: "Carol White", department: "Marketing", score: 4.3, status: "Good", lastReview: "2026-06-28" },
  { name: "David Lee", department: "Engineering", score: 4.1, status: "Good", lastReview: "2026-07-20" },
  { name: "Eva Singh", department: "Finance", score: 3.9, status: "Good", lastReview: "2026-06-15" },
  { name: "Frank Brown", department: "HR", score: 3.2, status: "Average", lastReview: "2026-07-05" },
  { name: "Grace Kim", department: "Engineering", score: 2.8, status: "Average", lastReview: "2026-05-30" },
  { name: "Henry Davis", department: "Sales", score: 2.1, status: "Below Average", lastReview: "2026-06-20" },
];

const goals = [
  { name: "Revenue Growth", target: "$2.5M", current: "$2.2M", progress: 88 },
  { name: "Customer Satisfaction", target: "95%", current: "92%", progress: 97 },
  { name: "Employee Retention", target: "90%", current: "85%", progress: 94 },
  { name: "Project Delivery", target: "100%", current: "87%", progress: 87 },
  { name: "Training Hours", target: "500 hrs", current: "420 hrs", progress: 84 },
];

function getScoreBadge(score: number) {
  if (score >= 4.5) return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">Excellent</span>;
  if (score >= 3.5) return <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">Good</span>;
  if (score >= 2.5) return <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600">Average</span>;
  return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">Below Average</span>;
}

export default function PerformancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Performance Management
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track employee performance, KPIs, and organizational goals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="bg-[var(--card)] border-[var(--border)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--card-foreground)]">{card.value}</div>
              <p className="text-xs text-[var(--muted-foreground)]">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">Employee</th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">Department</th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">Score</th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">Last Review</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.name} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 font-medium text-[var(--card-foreground)]">{emp.name}</td>
                    <td className="py-3 text-[var(--muted-foreground)]">{emp.department}</td>
                    <td className="py-3 text-[var(--card-foreground)]">{emp.score.toFixed(1)} / 5</td>
                    <td className="py-3">{getScoreBadge(emp.score)}</td>
                    <td className="py-3 text-[var(--muted-foreground)]">{emp.lastReview}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <BarChart3 className="h-5 w-5 text-[var(--muted-foreground)]" />
            Goals Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {goals.map((goal) => (
              <div key={goal.name} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--card-foreground)]">{goal.name}</span>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {goal.current} / {goal.target}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="text-right text-xs text-[var(--muted-foreground)]">
                  {goal.progress}% complete
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
