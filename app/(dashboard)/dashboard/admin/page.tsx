"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import Link from "next/link";
import SummaryCards from "@/components/dashboard/SummaryCards";
import ChartsSection from "@/components/dashboard/ChartsSection";
import {
  Users,
  UserCog,
  DollarSign,
  CalendarOff,
  Briefcase,
  FolderKanban,
  Star,
  Settings,
  BarChart3,
  ScrollText,
  Users2,
} from "lucide-react";
import type { Profile } from "@/types";

const adminLinks = [
  { label: "User Management", href: "/dashboard/admin/users", icon: Users },
  { label: "Employee Management", href: "/dashboard/admin/employees", icon: UserCog },
  { label: "Payroll", href: "/dashboard/admin/payroll", icon: DollarSign },
  { label: "Leave Management", href: "/dashboard/admin/leave", icon: CalendarOff },
  { label: "Recruitment", href: "/dashboard/admin/recruitment", icon: Briefcase },
  { label: "Team Overview", href: "/dashboard/admin/teams", icon: Users2 },
  { label: "Performance Reviews", href: "/dashboard/admin/performance", icon: Star },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  { label: "Activity Logs", href: "/dashboard/admin/activity-logs", icon: ScrollText },
  { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
];

export default function AdminDashboardPage() {
  const [profile, setProfile] = useState<Pick<Profile, "full_name"> | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data() as Profile;
          setProfile({ full_name: data.full_name });
        }
      } catch {
        setProfile({ full_name: "Admin" });
      }
    });
    return () => unsubscribe();
  }, []);

  const displayName = profile?.full_name ?? "Admin";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[var(--card-foreground)]">
          Admin Dashboard
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Welcome back, <span className="font-semibold text-[var(--foreground)]">{displayName}</span>. You have full access to all modules.
        </p>
      </div>

      <SummaryCards />
      <ChartsSection />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">
          Quick Access
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              >
                <Icon className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
