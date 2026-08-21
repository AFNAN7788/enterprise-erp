"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "@/types";
import { createTaskAction, updateTaskAction } from "@/app/actions/tasks";

const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required."),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task | null;
  teamMembers: { id: string; fullName: string }[];
}

export default function TaskForm({ isOpen, onClose, projectId, task, teamMembers }: Props) {
  const isEditMode = !!task;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      assigneeId: "",
      dueDate: "",
      priority: "medium",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (task) {
        reset({
          title: task.title || "",
          description: task.description || "",
          status: task.status,
          assigneeId: task.assigneeId || "",
          dueDate: task.dueDate || "",
          priority: task.priority,
        });
      } else {
        reset({
          title: "",
          description: "",
          status: "todo",
          assigneeId: "",
          dueDate: "",
          priority: "medium",
        });
      }
    }
  }, [isOpen, task, reset]);

  if (!isOpen) return null;

  async function onSubmit(data: TaskFormData) {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const payload = { ...data, projectId };
      const result = isEditMode && task
        ? await updateTaskAction(task.id, payload)
        : await createTaskAction(payload);

      if (result.success) {
        onClose();
      } else {
        setErrorMsg(result.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
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
        aria-labelledby="task-form-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 id="task-form-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {isEditMode ? "Edit Task" : "Create Task"}
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

        {errorMsg && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
          <div>
            <label htmlFor="title" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Task Title *
            </label>
            <input
              id="title"
              type="text"
              {...register("title")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Implement login page"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Task details..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label htmlFor="priority" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Priority
              </label>
              <select
                id="priority"
                {...register("priority")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assigneeId" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Assignee
              </label>
              <select
                id="assigneeId"
                {...register("assigneeId")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dueDate" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Due Date
              </label>
              <input
                id="dueDate"
                type="date"
                {...register("dueDate")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
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
              {isEditMode ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}