"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, ChevronDown, LogOut, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";

// ─── Path → page title map ────────────────────────────────────────────────────

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";

  // Map last segment to a human-readable title
  const last = segments[segments.length - 1];
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    profile: "Profile",
    users: "User Management",
    settings: "Settings",
    reports: "Reports",
    employees: "Employee Management",
    payroll: "Payroll",
    leave: "Leave Management",
    recruitment: "Recruitment",
    teams: "Team Overview",
    projects: "Projects",
    performance: "Performance Reviews",
    tasks: "My Tasks",
    payslips: "Payslips",
  };
  return titles[last] ?? last.charAt(0).toUpperCase() + last.slice(1);
}

// ─── Avatar initials helper ───────────────────────────────────────────────────

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  profile: Pick<Profile, "full_name" | "email" | "avatar_url">;
  onMenuToggle: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header({ profile, onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(pathname);
  const initials = getInitials(profile.full_name, profile.email);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  async function handleSignOut() {
    setDropdownOpen(false);
    await signOut(auth);
    // Clear session cookie
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-card px-4">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        {/* Hamburger toggle — visible only on mobile */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base font-semibold text-[var(--foreground)]">
          {pageTitle}
        </h1>
      </div>

      {/* Right: theme toggle + notifications + user avatar + dropdown */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5",
            "text-sm font-medium text-[var(--foreground)]",
            "hover:bg-[var(--accent)] transition-colors",
            dropdownOpen && "bg-[var(--accent)]"
          )}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="User menu"
        >
          {/* Avatar */}
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? profile.email}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">
              {initials}
            </span>
          )}

          {/* Name (hidden on very small screens) */}
          <span className="hidden sm:block max-w-[140px] truncate">
            {profile.full_name ?? profile.email}
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200",
              dropdownOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div
            className={cn(
              "absolute right-0 top-full mt-1 z-50",
              "w-48 rounded-md border border-[var(--border)] bg-[var(--popover)] shadow-md",
              "py-1"
            )}
            role="menu"
            aria-label="User menu options"
          >
            {/* User info */}
            <div className="border-b border-[var(--border)] px-3 py-2">
              <p className="text-xs font-medium text-[var(--foreground)] truncate">
                {profile.full_name ?? "User"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                {profile.email}
              </p>
            </div>

            {/* Profile link */}
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                router.push("/dashboard/profile");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <User className="h-4 w-4 text-[var(--muted-foreground)]" />
              Profile
            </button>

            {/* Sign out */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--destructive)] hover:bg-[var(--accent)] transition-colors"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
