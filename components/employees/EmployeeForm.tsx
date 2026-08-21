"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import type { Employee } from "@/types";
import { toast } from "sonner";
import { createEmployeeAction, updateEmployeeAction } from "@/app/actions/employees";

// Define a unified Form Schema with string types for HTML input binding compatibility
const employeeFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().optional().or(z.literal("")),
  phone: z.string().nullable().optional().or(z.literal("")),
  department: z.string().min(1, "Department is required."),
  position: z.string().min(1, "Position is required."),
  status: z.enum(["active", "inactive"]),
  managerId: z.string().nullable().optional().or(z.literal("")),
  salary: z.string().nullable().optional().or(z.literal("")),
  hireDate: z.string().min(1, "Hire date is required."),
  role: z.enum(["employee", "manager", "admin", "hr"]),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null; // If passed, edit mode is enabled
  managers: { id: string; fullName: string }[];
  onSubmitSuccess: () => void;
}

const DEPARTMENTS = [
  "Engineering",
  "HR",
  "Finance",
  "Marketing",
  "Sales",
  "Operations",
  "Product",
];

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR Specialist" },
  { value: "admin", label: "Administrator" },
];

export default function EmployeeForm({
  isOpen,
  onClose,
  employee,
  managers,
  onSubmitSuccess,
}: EmployeeFormProps) {
  const isEditMode = !!employee;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      department: "",
      position: "",
      status: "active",
      managerId: "",
      salary: "",
      hireDate: new Date().toISOString().split("T")[0],
      role: "employee",
    },
  });

  // Reset form when employee prop or modal open state changes
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        reset({
          fullName: employee.fullName || "",
          email: employee.email || "",
          password: "", // Never populate password field
          phone: employee.phone || "",
          department: employee.department || "",
          position: employee.position || "",
          status: employee.status || "active",
          managerId: employee.managerId || "",
          salary: employee.salary ? String(employee.salary) : "",
          hireDate: employee.hireDate || "",
          role: (employee as any).role || "employee",
        });
      } else {
        reset({
          fullName: "",
          email: "",
          password: "",
          phone: "",
          department: "",
          position: "",
          status: "active",
          managerId: "",
          salary: "",
          hireDate: new Date().toISOString().split("T")[0],
          role: "employee",
        });
      }
    }
  }, [isOpen, employee, reset]);

  if (!isOpen) return null;

  async function onSubmit(data: EmployeeFormData) {
    setIsSubmitting(true);

    try {
      const parsedSalary = data.salary ? parseFloat(data.salary) : null;
      if (data.salary && isNaN(parsedSalary as number)) {
        toast.error("Salary must be a valid number.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...data,
        salary: parsedSalary,
      };

      let result;
      if (isEditMode && employee) {
        const updateData = { ...payload };
        if (!updateData.password) {
          delete updateData.password;
        }
        result = await updateEmployeeAction(employee.id, updateData as any);
      } else {
        if (!data.password || data.password.length < 8) {
          toast.error("Password is required and must be at least 8 characters.");
          setIsSubmitting(false);
          return;
        }
        result = await createEmployeeAction(payload as any);
      }

      if (result.success) {
        toast.success(isEditMode ? "Employee updated successfully" : "Employee created successfully");
        onSubmitSuccess();
        onClose();
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2
            id="form-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {isEditMode ? "Edit Employee Details" : "Register New Employee"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                {...register("fullName")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="Jane Doe"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="jane.doe@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password (only in create mode) */}
            {!isEditMode && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Account Password
                </label>
                <input
                  id="password"
                  type="password"
                  {...register("password")}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="Min. 8 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                {...register("phone")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="+92 300 1234567"
              />
            </div>

            {/* Department */}
            <div>
              <label
                htmlFor="department"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Department
              </label>
              <select
                id="department"
                {...register("department")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.department.message}
                </p>
              )}
            </div>

            {/* Position */}
            <div>
              <label
                htmlFor="position"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Job Title / Position
              </label>
              <input
                id="position"
                type="text"
                {...register("position")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="Senior Engineer"
              />
              {errors.position && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.position.message}
                </p>
              )}
            </div>

            {/* System Access Role */}
            <div>
              <label
                htmlFor="role"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                ERP System Role
              </label>
              <select
                id="role"
                {...register("role")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Manager Selection */}
            <div>
              <label
                htmlFor="managerId"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Reporting Manager
              </label>
              <select
                id="managerId"
                {...register("managerId")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">No Reporting Manager</option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Salary */}
            <div>
              <label
                htmlFor="salary"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Monthly Salary ($)
              </label>
              <input
                id="salary"
                type="number"
                step="0.01"
                {...register("salary")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="5000"
              />
              {errors.salary && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.salary.message}
                </p>
              )}
            </div>

            {/* Hire Date */}
            <div>
              <label
                htmlFor="hireDate"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Hire Date
              </label>
              <input
                id="hireDate"
                type="date"
                {...register("hireDate")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              {errors.hireDate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.hireDate.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Employment Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white transition hover:bg-zinc-50 outline-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:focus:ring-zinc-800"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
