"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Users,
  Briefcase,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from "lucide-react";

const jobPostings = [
  {
    id: 1,
    position: "Software Engineer",
    department: "Engineering",
    status: "Active",
    applications: 18,
    postedDate: "2026-07-15",
  },
  {
    id: 2,
    position: "HR Manager",
    department: "HR",
    status: "Active",
    applications: 12,
    postedDate: "2026-07-20",
  },
  {
    id: 3,
    position: "Sales Executive",
    department: "Sales",
    status: "Active",
    applications: 7,
    postedDate: "2026-08-01",
  },
  {
    id: 4,
    position: "Finance Analyst",
    department: "Finance",
    status: "Closed",
    applications: 3,
    postedDate: "2026-06-10",
  },
  {
    id: 5,
    position: "Marketing Lead",
    department: "Marketing",
    status: "Draft",
    applications: 2,
    postedDate: "2026-08-10",
  },
];

const applications = [
  {
    id: 1,
    candidate: "Alice Johnson",
    position: "Software Engineer",
    status: "Interview",
    appliedDate: "2026-07-18",
  },
  {
    id: 2,
    candidate: "Bob Smith",
    position: "HR Manager",
    status: "Pending",
    appliedDate: "2026-07-22",
  },
  {
    id: 3,
    candidate: "Carol Williams",
    position: "Software Engineer",
    status: "Offer",
    appliedDate: "2026-07-16",
  },
  {
    id: 4,
    candidate: "David Brown",
    position: "Sales Executive",
    status: "Rejected",
    appliedDate: "2026-08-02",
  },
  {
    id: 5,
    candidate: "Eva Martinez",
    position: "Software Engineer",
    status: "Pending",
    appliedDate: "2026-08-05",
  },
  {
    id: 6,
    candidate: "Frank Lee",
    position: "HR Manager",
    status: "Interview",
    appliedDate: "2026-07-25",
  },
  {
    id: 7,
    candidate: "Grace Kim",
    position: "Finance Analyst",
    status: "Offer",
    appliedDate: "2026-06-12",
  },
  {
    id: 8,
    candidate: "Henry Clark",
    position: "Sales Executive",
    status: "Pending",
    appliedDate: "2026-08-03",
  },
];

const summaryCards = [
  { label: "Total Open Positions", value: 5, icon: Briefcase },
  { label: "Applications Received", value: 42, icon: Users },
  { label: "Interviews Scheduled", value: 8, icon: Clock },
  { label: "Offers Extended", value: 3, icon: CheckCircle },
];

const statusTabs = ["All", "Pending", "Interview", "Offer", "Rejected"] as const;
type StatusFilter = (typeof statusTabs)[number];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Closed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Interview: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("All");

  const filtered =
    activeTab === "All"
      ? applications
      : applications.filter((a) => a.status === activeTab);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Recruitment
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage job postings, track applicants, and streamline the hiring
            process.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--card)]">
          <Plus className="h-4 w-4" />
          New Job Posting
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className="bg-[var(--card)] border-[var(--border)]"
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--muted-foreground)]/10">
                <card.icon className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {card.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <Briefcase className="h-5 w-5 text-[var(--muted-foreground)]" />
            Job Postings
          </CardTitle>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Position
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Department
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Status
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Applications
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Posted Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobPostings.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 font-medium text-[var(--foreground)]">
                      {job.position}
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {job.department}
                    </td>
                    <td className="py-3">{statusBadge(job.status)}</td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {job.applications}
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {job.postedDate}
                    </td>
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
            <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {statusTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-[var(--foreground)] text-[var(--card)]"
                    : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted-foreground)]/10"
                }`}
              >
                {tab}
                {tab !== "All" && (
                  <span className="ml-1.5 text-[var(--muted-foreground)]">
                    ({applications.filter((a) => a.status === tab).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Candidate
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Position
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Status
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Applied Date
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 font-medium text-[var(--foreground)]">
                      {app.candidate}
                    </td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {app.position}
                    </td>
                    <td className="py-3">{statusBadge(app.status)}</td>
                    <td className="py-3 text-[var(--muted-foreground)]">
                      {app.appliedDate}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {app.status === "Pending" && (
                          <>
                            <button className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted-foreground)]/10">
                              <Clock className="h-3 w-3" />
                              Schedule
                            </button>
                            <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === "Interview" && (
                          <>
                            <button className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted-foreground)]/10">
                              <CheckCircle className="h-3 w-3" />
                              Advance
                            </button>
                            <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                              <XCircle className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}
                        {app.status === "Offer" && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Awaiting response
                          </span>
                        )}
                        {app.status === "Rejected" && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No applications found for this filter.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
