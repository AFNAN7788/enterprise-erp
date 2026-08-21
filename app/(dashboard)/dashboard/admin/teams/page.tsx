"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Mail, Phone, Building, User, Search } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  status: "active" | "inactive";
  avatarColor: string;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-red-500",
  "bg-yellow-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function TeamOverviewPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const employeesSnap = await getDocs(collection(db, "employees"));
        const profilePromises = employeesSnap.docs.map(async (empDoc) => {
          const empData = empDoc.data();
          const profileRef = doc(db, "profiles", empDoc.id);
          const profileSnap = await getDoc(profileRef);
          const profileData = profileSnap.exists() ? profileSnap.data() : {};

          return {
            id: empDoc.id,
            name: profileData.fullName || empData.fullName || empData.name || "Unknown",
            email: profileData.email || empData.email || "",
            phone: profileData.phone || empData.phone || "",
            department: empData.department || "Unassigned",
            position: empData.position || empData.jobTitle || "Employee",
            status: (empData.status as "active" | "inactive") || "active",
            avatarColor: getAvatarColor(
              profileData.fullName || empData.fullName || empData.name || "Unknown"
            ),
          } as TeamMember;
        });

        const fetchedMembers = await Promise.all(profilePromises);
        setMembers(fetchedMembers);
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filtered = members.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === "all" || m.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = Array.from(new Set(members.map((m) => m.department))).sort();
  const activeCount = members.filter((m) => m.status === "active").length;
  const departmentCounts = members.reduce(
    (acc, m) => {
      acc[m.department] = (acc[m.department] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Team Overview
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            View team structures, member assignments, and organizational hierarchy.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-[var(--card)] border-[var(--border)]">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--muted-foreground)]/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-[var(--muted-foreground)]/10 animate-pulse" />
                    <div className="h-3 w-16 rounded bg-[var(--muted-foreground)]/10 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-[var(--card)] border-[var(--border)]">
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--muted-foreground)]/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-[var(--muted-foreground)]/10 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-[var(--muted-foreground)]/10 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-[var(--muted-foreground)]/10 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Team Overview
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          View team structures, member assignments, and organizational hierarchy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--card-foreground)]">{members.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--card-foreground)]">{activeCount}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Building className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--card-foreground)]">
                  {departments.length}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-transparent py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept} ({departmentCounts[dept]})
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--foreground)]/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-[var(--muted-foreground)] opacity-40" />
              <p className="mt-4 text-sm font-medium text-[var(--card-foreground)]">
                No team members found
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => (
            <Card
              key={member.id}
              className="bg-[var(--card)] border-[var(--border)] transition-colors hover:border-[var(--foreground)]/20"
            >
              <CardContent>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-semibold text-lg ${member.avatarColor}`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-[var(--card-foreground)]">
                        {member.name}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {member.position}
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <Building className="h-3 w-3 shrink-0" />
                        <span className="truncate">{member.department}</span>
                      </div>
                      {member.email && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
