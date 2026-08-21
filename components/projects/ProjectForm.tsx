"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import type { Project, ProjectStatus } from "@/types";
import { createProjectAction, updateProjectAction } from "@/app/actions/projects";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["planning", "active", "on_hold", "completed"]),
  clientId: z.string().optional().or(z.literal("")),
  managerId: z.string().min(1, "Project manager is required."),
  teamMembers: z.array(z.string()).optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  clients: { id: string; name: string }[];
  managers: { id: string; fullName: string }[];
  teamMembers: { id: string; fullName: string }[];
}

export default function ProjectForm({
  isOpen,
  onClose,
  project,
  clients,
  managers,
  teamMembers,
}: Props) {
  const isEditMode = !!project;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
      clientId: "",
      managerId: "",
      teamMembers: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (project) {
        reset({
          name: project.name || "",
          description: project.description || "",
          status: project.status,
          clientId: project.clientId || "",
          managerId: project.managerId,
          teamMembers: project.teamMembers || [],
        });
        setSelectedTeam(project.teamMembers || []);
      } else {
        reset({
          name: "",
          description: "",
          status: "planning",
          clientId: "",
          managerId: "",
          teamMembers: [],
        });
        setSelectedTeam([]);
      }
    }
  }, [isOpen, project, reset]);

  if (!isOpen) return null;

  function toggleTeamMember(id: string) {
    setSelectedTeam((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function onSubmit(data: ProjectFormData) {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const payload = { ...data, teamMembers: selectedTeam };
      const result = isEditMode && project
        ? await updateProjectAction(project.id, payload)
        : await createProjectAction(payload);

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
        aria-labelledby="project-form-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 id="project-form-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {isEditMode ? "Edit Project" : "Create Project"}
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
            <label htmlFor="name" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              placeholder="Website Redesign"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
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
              placeholder="Project overview..."
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
              <label htmlFor="clientId" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Linked Client (CRM)
              </label>
              <select
                id="clientId"
                {...register("clientId")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="managerId" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Project Manager *
              </label>
              <select
                id="managerId"
                {...register("managerId")}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Select manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName}</option>
                ))}
              </select>
              {errors.managerId && <p className="mt-1 text-xs text-red-600">{errors.managerId.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Team Members
            </label>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleTeamMember(m.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedTeam.includes(m.id)
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                      : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  {m.fullName}
                </button>
              ))}
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
              {isEditMode ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}