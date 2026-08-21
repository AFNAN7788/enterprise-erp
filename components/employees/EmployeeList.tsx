"use client";

import { useEffect, useState, startTransition } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  Building,
  User,
  Shield,
  Phone,
  DollarSign,
  Briefcase,
  Calendar,
} from "lucide-react";
import type { Employee, Profile } from "@/types";
import EmployeeForm from "./EmployeeForm";
import { toast } from "sonner";
import { deleteEmployeeAction, toggleEmployeeStatusAction } from "@/app/actions/employees";

const DEPARTMENTS = [
  "Engineering",
  "HR",
  "Finance",
  "Marketing",
  "Sales",
  "Operations",
  "Product",
];

export default function EmployeeList({ defaultReadOnly = false }: { defaultReadOnly?: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 1. Listen to Auth state and fetch logged-in user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profileSnap = await getDoc(doc(db, "profiles", user.uid));
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data() as Profile);
          }
        } catch (err) {
          console.warn("Error fetching user profile:", err);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch managers list for dropdown (Admins and Managers)
  useEffect(() => {
    async function fetchManagers() {
      try {
        const q = query(collection(db, "profiles"), where("role", "in", ["admin", "manager"]));
        const snap = await getDocs(q);
        const mgrList = snap.docs.map((doc) => ({
          id: doc.id,
          fullName: doc.data().full_name || doc.data().email,
        }));
        setManagers(mgrList);
      } catch (err) {
        console.warn("Error fetching managers list:", err);
      }
    }
    fetchManagers();
  }, []);

  // 3. Listen to employees collection in Firestore (Live Updates)
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    setLoading(true);

    // Build the query
    let employeesRef = collection(db, "employees");
    let q: any = query(employeesRef);

    // RBAC: Manager can only view their own team
    if (userProfile.role === "manager") {
      q = query(q, where("managerId", "==", currentUser.uid));
    }

    // Apply Department filter using Firestore Query
    if (selectedDept) {
      q = query(q, where("department", "==", selectedDept));
    }

    // Apply Status filter using Firestore Query
    if (selectedStatus) {
      q = query(q, where("status", "==", selectedStatus));
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snapshot = await getDocs(q);
        if (cancelled) return;
        const empList: Employee[] = [];
        snapshot.forEach((doc: any) => {
          empList.push({ id: doc.id, ...doc.data() } as Employee);
        });
        empList.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
        setEmployees(empList);
        setLoading(false);
      } catch (error: any) {
        console.warn("Collection fetch skipped:", error);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentUser, userProfile, selectedDept, selectedStatus]);

  // Determine read-only view dynamically (HR is read-only, Admin has write access)
  const isAdmin = userProfile?.role === "admin";
  const isReadOnly = defaultReadOnly || !isAdmin;

  // Search filter (Client side string matching for Name/Email)
  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.position?.toLowerCase().includes(searchLower)
    );
  });

  // Action handlers
  async function handleDelete(id: string) {
    setActionLoading(true);
    try {
      const res = await deleteEmployeeAction(id);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success("Employee deleted successfully");
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during deletion.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: "active" | "inactive") {
    setActionLoading(true);
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await toggleEmployeeStatusAction(id, newStatus);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success(`Employee status updated to ${newStatus}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred updating status.");
    } finally {
      setActionLoading(false);
    }
  }

  // Get Reporting Manager Name
  function getManagerName(managerId?: string) {
    if (!managerId) return "N/A";
    const mgr = managers.find((m) => m.id === managerId);
    return mgr ? mgr.fullName : "Unknown";
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Employee Management
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your organization's directory, track reporting structures, and roles.
          </p>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => {
              setEditingEmployee(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-950 dark:focus:ring-zinc-800"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Employee
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, email or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 pl-10 pr-4 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-zinc-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-900 border-t-transparent dark:border-zinc-100" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <User className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              No employees found
            </p>
            <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department & Position</th>
                  <th className="px-6 py-4">Reporting Manager</th>
                  <th className="px-6 py-4">Hire Date</th>
                  {(isAdmin || userProfile?.role === "hr") && (
                    <th className="px-6 py-4">Salary</th>
                  )}
                  <th className="px-6 py-4">Status</th>
                  {!isReadOnly && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-zinc-50/50 transition dark:hover:bg-zinc-900/20"
                  >
                    {/* Employee Profile */}
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {emp.fullName}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {emp.email}
                          </p>
                          {emp.phone && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                              <Phone className="h-3 w-3" /> {emp.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department / Job Title */}
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {emp.position}
                      </p>
                      <p className="text-xs text-zinc-500">{emp.department}</p>
                    </td>

                    {/* Reporting Manager */}
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {getManagerName(emp.managerId)}
                    </td>

                    {/* Hire Date */}
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {emp.hireDate}
                    </td>

                    {/* Salary (Only shown to Admin and HR) */}
                    {(isAdmin || userProfile?.role === "hr") && (
                      <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-50">
                        {emp.salary ? `$${emp.salary.toLocaleString()}` : "N/A"}
                      </td>
                    )}

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          emp.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : "bg-zinc-150 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            emp.status === "active" ? "bg-green-600" : "bg-zinc-400"
                          }`}
                        />
                        {emp.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setIsFormOpen(true);
                            }}
                            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                            title="Edit Employee"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp.id, emp.status)}
                            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                            title={emp.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {emp.status === "active" ? (
                              <UserX className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <UserCheck className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(emp.id)}
                            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-red-400"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <EmployeeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        managers={managers}
        onSubmitSuccess={() => {
          // Toast or message handled inside Server Actions or form logic
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Confirm Delete Employee
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete this employee? This will permanently delete their
              employee profile, access role, and Firebase login credentials. This action cannot be
              undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={actionLoading}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white transition hover:bg-zinc-50 outline-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 outline-none disabled:opacity-50"
              >
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
