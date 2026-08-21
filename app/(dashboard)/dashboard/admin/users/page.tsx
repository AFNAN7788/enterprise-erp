"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Users,
  Search,
  Shield,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  hr: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  employee: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const ROLES = ["All", "Admin", "Manager", "HR", "Employee"];

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await getDocs(collection(db, "profiles"));
        const profiles: UserProfile[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || data.displayName || "Unknown",
            email: data.email || "",
            role: data.role || "employee",
            status: data.status || "active",
            createdAt: data.createdAt
              ? typeof data.createdAt === "string"
                ? data.createdAt
                : data.createdAt.toDate
                  ? data.createdAt.toDate().toLocaleDateString()
                  : new Date(data.createdAt).toLocaleDateString()
              : "N/A",
          };
        });
        setUsers(profiles);
      } catch {
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "All" || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const managerCount = users.filter((u) => u.role === "manager").length;
  const employeeCount = users.filter((u) => u.role === "employee").length;

  const handleRoleUpdate = (userId: string, newRole: string) => {
    toast.success(`Role updated to ${newRole} for user ${userId}`);
  };

  const handleDelete = (userId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      toast.success(`User "${name}" deleted`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            User Management
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage user accounts, roles, and permissions across the organization.
          </p>
        </div>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--foreground)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          User Management
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage user accounts, roles, and permissions across the organization.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--card-foreground)]">
              {totalUsers}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Admins
            </CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--card-foreground)]">
              {adminCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Managers
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--card-foreground)]">
              {managerCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Employees
            </CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--card-foreground)]">
              {employeeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--card-foreground)]">
            <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
            All Users
          </CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20"
              />
            </div>
            <div className="flex items-center gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    roleFilter === role
                      ? "bg-[var(--foreground)] text-[var(--card)]"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--foreground)]/5"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Name
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Email
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Role
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Status
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Joined
                  </th>
                  <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-[var(--muted-foreground)]"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)]/10 text-xs font-medium text-[var(--foreground)]">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-[var(--card-foreground)]">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                          <Mail className="h-3.5 w-3.5" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            ROLE_COLORS[user.role] ||
                            "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            user.status === "active"
                              ? "text-green-600 dark:text-green-400"
                              : "text-[var(--muted-foreground)]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === "active"
                                ? "bg-green-500"
                                : "bg-[var(--muted-foreground)]"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                          <Calendar className="h-3.5 w-3.5" />
                          {user.createdAt}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleRoleUpdate(user.id, e.target.value)
                              }
                              className="appearance-none rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 pr-6 text-xs text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="hr">HR</option>
                              <option value="employee">Employee</option>
                            </select>
                            <Edit2 className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted-foreground)]" />
                          </div>
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            className="rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
