"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import Link from "next/link";
import SummaryCards from "@/components/dashboard/SummaryCards";
import ChartsSection from "@/components/dashboard/ChartsSection";
import {
  UserCog,
  DollarSign,
  CalendarOff,
  Briefcase,
  FolderKanban,
  Users,
} from "lucide-react";
import type { Profile } from "@/types";

const hrLinks = [
  { label: "Employee Management", href: "/dashboard/hr/employees", icon: UserCog },
  { label: "Payroll", href: "/dashboard/hr/payroll", icon: DollarSign },
  { label: "Leave Management", href: "/dashboard/hr/leave", icon: CalendarOff },
  { label: "Recruitment", href: "/dashboard/hr/recruitment", icon: Briefcase },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
];

export default function HRDashboardPage() {
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
        setProfile({ full_name: "HR" });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[var(--card-foreground)]">
          HR Dashboard
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Welcome back, <span className="font-semibold text-[var(--foreground)]">{profile?.full_name ?? "HR"}</span>.
        </p>
      </div>

      <SummaryCards />
      <ChartsSection />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">
          Quick Access
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {hrLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
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
