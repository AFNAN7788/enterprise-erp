"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { submitLeaveRequestAction } from "@/app/actions/leaves";

// Zod schema for client-side validation
const leaveSchema = z.object({
  type: z.enum(["sick", "casual", "annual", "unpaid"] as const, {
    error: "Leave type is required.",
  }),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  reason: z.string().min(10, "Reason must be at least 10 characters.").max(500, "Max 500 characters."),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: "End date cannot be before start date.", path: ["endDate"] }
);

type LeaveFormData = z.infer<typeof leaveSchema>;

const LEAVE_TYPES = [
  { value: "sick",    label: "Sick Leave",   description: "Medical illness or injury" },
  { value: "casual",  label: "Casual Leave",  description: "Personal or family matters" },
  { value: "annual",  label: "Annual Leave",  description: "Planned vacation time" },
  { value: "unpaid",  label: "Unpaid Leave",  description: "Leave without pay" },
];

interface Props {
  onSuccess?: () => void;
}

export default function LeaveRequestForm({ onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      type: "casual",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  async function onSubmit(data: LeaveFormData) {
    const result = await submitLeaveRequestAction(data);
    if (result.success) {
      toast.success("Leave request submitted successfully! Awaiting approval.");
      reset();
      onSuccess?.();
    } else {
      toast.error(result.error || "Failed to submit request.");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Apply for Leave
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Submit a leave request for your manager or HR to review.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
        {/* Leave Type */}
        <div>
          <label htmlFor="leave-type" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Leave Type
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEAVE_TYPES.map((lt) => (
              <label
                key={lt.value}
                className="relative flex cursor-pointer flex-col rounded-lg border border-zinc-200 p-3 transition has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:border-zinc-800 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-900/50"
              >
                <input
                  type="radio"
                  value={lt.value}
                  {...register("type")}
                  className="sr-only"
                />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{lt.label}</span>
                <span className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{lt.description}</span>
              </label>
            ))}
          </div>
          {errors.type && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.type.message}</p>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              {...register("startDate")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
            {errors.startDate && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              {...register("endDate")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
            {errors.endDate && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Reason for Leave
          </label>
          <textarea
            id="reason"
            rows={4}
            {...register("reason")}
            placeholder="Describe the reason for your leave request (minimum 10 characters)..."
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.reason.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}
