"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { Profile } from "@/types";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as Profile);
        } else {
          // Profile not in Firestore yet — use defaults so UI still works
          setProfile({
            id: user.uid,
            email: user.email ?? "",
            full_name: user.displayName ?? "User",
            role: "employee",
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setProfile({
          id: user.uid,
          email: user.email ?? "",
          full_name: user.displayName ?? "User",
          role: "employee",
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar
        userRole={profile.role}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={{
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
          }}
          onMenuToggle={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
