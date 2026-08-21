"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import SummaryCards from "@/components/dashboard/SummaryCards";
import ChartsSection from "@/components/dashboard/ChartsSection";
import type { Profile } from "@/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Pick<Profile, "full_name" | "role"> | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setEmail(user.email ?? "");

      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data() as Profile;
          setProfile({ full_name: data.full_name, role: data.role });
        } else {
          setProfile({ full_name: "User", role: "employee" });
        }
      } catch {
        setProfile({ full_name: "User", role: "employee" });
      }
    });

    return () => unsubscribe();
  }, []);

  const displayName = profile?.full_name ?? email ?? "User";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-[var(--card-foreground)]">
          Welcome back, {displayName}!
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          You are signed in as{" "}
          <span className="inline-flex items-center rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-xs font-semibold capitalize text-[var(--secondary-foreground)]">
            {profile?.role ?? "user"}
          </span>
        </p>
      </div>

      <SummaryCards />
      <ChartsSection />
    </div>
  );
}
