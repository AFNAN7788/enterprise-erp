"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Users,
  Settings,
  BarChart3,
  UserCog,
  DollarSign,
  CalendarOff,
  Briefcase,
  Users2,
  FolderKanban,
  Star,
  ListTodo,
  FileText,
  Contact,
  ShoppingBag,
  Receipt,
  FolderOpen,
  ScrollText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarProps, NavItem, UserRole } from "@/types";

// ─── Nav item helpers ────────────────────────────────────────────────────────

const COMMON_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "CRM", href: "/dashboard/crm", icon: Contact },
  { label: "Inventory", href: "/dashboard/inventory", icon: ShoppingBag },
  { label: "Sales & Purchase", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Expenses", href: "/dashboard/expenses", icon: Receipt },
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen },
];

const ROLE_NAV: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "User Management", href: "/dashboard/admin/users", icon: Users },
    { label: "Settings", href: "/dashboard/admin/settings", icon: Settings },
    { label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
    {
      label: "Employee Management",
      href: "/dashboard/admin/employees",
      icon: UserCog,
    },
    { label: "Payroll", href: "/dashboard/admin/payroll", icon: DollarSign },
    { label: "Activity Logs", href: "/dashboard/admin/activity-logs", icon: ScrollText },
    {
      label: "Leave Management",
      href: "/dashboard/admin/leave",
      icon: CalendarOff,
    },
    { label: "Recruitment", href: "/dashboard/admin/recruitment", icon: Briefcase },
    { label: "Team Overview", href: "/dashboard/admin/teams", icon: Users2 },
    { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    {
      label: "Performance Reviews",
      href: "/dashboard/admin/performance",
      icon: Star,
    },
  ],
  hr: [
    {
      label: "Employee Management",
      href: "/dashboard/hr/employees",
      icon: UserCog,
    },
    { label: "Payroll", href: "/dashboard/hr/payroll", icon: DollarSign },
    {
      label: "Leave Management",
      href: "/dashboard/hr/leave",
      icon: CalendarOff,
    },
    { label: "Recruitment", href: "/dashboard/hr/recruitment", icon: Briefcase },
  ],
  manager: [
    { label: "Team Overview", href: "/dashboard/manager/teams", icon: Users2 },
    { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    {
      label: "Team Leave Requests",
      href: "/dashboard/manager/leave",
      icon: CalendarOff,
    },
    {
      label: "Performance Reviews",
      href: "/dashboard/manager/performance",
      icon: Star,
    },
  ],
  employee: [
    { label: "My Tasks", href: "/dashboard/employee/tasks", icon: ListTodo },
    { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    {
      label: "Attendance",
      href: "/dashboard/employee/attendance",
      icon: CalendarOff,
    },
    {
      label: "Leave Requests",
      href: "/dashboard/employee/leave",
      icon: CalendarOff,
    },
    { label: "Payslips", href: "/dashboard/employee/payslips", icon: FileText },
  ],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sidebar({ userRole, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [...COMMON_NAV, ...(ROLE_NAV[userRole] ?? [])];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base layout
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col",
          // Background & border
          "border-r bg-card",
          "border-[var(--border)]",
          // Transition for mobile slide
          "transition-transform duration-300 ease-in-out",
          // Desktop: always visible
          "md:static md:translate-x-0 md:z-auto",
          // Mobile: toggled
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-4">
          <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            NexGen ERP
          </span>

          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  // Close sidebar on mobile when a link is clicked
                  if (isOpen) onToggle();
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  "transition-colors duration-150",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-[var(--primary-foreground)]"
                        : "text-[var(--muted-foreground)]"
                    )}
                  />
                )}
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Role badge at the bottom */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">Signed in as</p>
          <p className="mt-0.5 text-sm font-medium capitalize text-[var(--foreground)]">
            {userRole}
          </p>
        </div>
      </aside>
    </>
  );
}
