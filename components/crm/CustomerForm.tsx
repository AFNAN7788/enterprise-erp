"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import type { Customer, CustomerStatus } from "@/types";
import { createCustomerAction, updateCustomerAction } from "@/app/actions/customers";
import { toast } from "sonner";

const customerFormSchema = z.object({
  name: z.string().min(1, "Customer name is required."),
  company: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email.").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  status: z.enum(["lead", "prospect", "active", "inactive"]),
  assignedTo: z.string().min(1, "Assignee is required."),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const STATUSES: { value: CustomerStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  teamMembers: { id: string; fullName: string }[];
  currentUserId: string;
  isAdmin: boolean;
}

export default function CustomerForm({
  isOpen,
  onClose,
  customer,
  teamMembers,
  currentUserId,
  isAdmin,
}: Props) {
  const isEditMode = !!customer;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      status: "lead",
      assignedTo: currentUserId,
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        reset({
          name: customer.name || "",
          company: customer.company || "",
          email: customer.email || "",
          phone: customer.phone || "",
          status: customer.status,
          assignedTo: customer.assignedTo,
          notes: customer.notes || "",
        });
      } else {
        reset({
          name: "",
          company: "",
          email: "",
          phone: "",
          status: "lead",
          assignedTo: currentUserId,
          notes: "",
        });
      }
    }
  }, [isOpen, customer, currentUserId, reset]);

  if (!isOpen) return null;

  async function onSubmit(data: CustomerFormData) {
    setIsSubmitting(true);
    try {
      const result = isEditMode && customer
        ? await updateCustomerAction(customer.id, data)
        : await createCustomerAction(data);

      if (result.success) {
        toast.success(isEditMode ? "Customer updated." : "Customer created.");
        onClose();
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-form-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 id="crm-form-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {isEditMode ? "Edit Customer" : "Add Customer"}
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Customer Name *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="Jane Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="company" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Company
              </label>
              <input
                id="company"
                type="text"
                {...register("company")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="Acme Inc."
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="jane@acme.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                {...register("phone")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                placeholder="+92 300 1234567"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                id="status"
                {...register("status")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assignedTo" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Assigned To
              </label>
              <select
                id="assignedTo"
                {...register("assignedTo")}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register("notes")}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Additional context about this customer..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}