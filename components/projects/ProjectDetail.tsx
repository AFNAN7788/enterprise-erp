"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { ArrowLeft, Building, User, Loader2, Calendar, FolderKanban } from "lucide-react";
import Link from "next/link";
import type { Project, ProjectStatus, Task, TaskPriority, Profile } from "@/types";

const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: "Planning", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  completed: { label: "Completed", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
};

const TASK_STATUS_META: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
  in_progress: { label: "In Progress", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  review: { label: "Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  done: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
  medium: { label: "Medium", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  high: { label: "High", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Live project doc
  useEffect(() => {
    let cancelled = false;
    const docRef = doc(db, "projects", projectId);
    async function fetchData() {
      try {
        const snap = await getDoc(docRef);
        if (cancelled) return;
        if (snap.exists()) setProject({ id: snap.id, ...snap.data() } as Project);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [projectId]);

  // Live tasks for this project
  useEffect(() => {
    const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Task[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Task));
        setTasks(list);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Project not found.</p>
        <Link href="/dashboard/projects" className="mt-2 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
          Back to Projects
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[project.status];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Project header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{project.description}</p>
            )}
          </div>
          <Link
            href={`/dashboard/projects/${projectId}/tasks`}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
          >
            <FolderKanban className="h-4 w-4" />
            Open Task Board
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <Building className="h-3.5 w-3.5" /> Client
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {project.clientName || "No client"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <User className="h-3.5 w-3.5" /> Manager
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {project.managerName || "Unassigned"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <Calendar className="h-3.5 w-3.5" /> Tasks
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {tasks.length} total
            </p>
          </div>
        </div>
      </div>

      {/* Tasks list */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">All Tasks</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Tasks for this project ({tasks.length})
          </p>
        </div>

        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            No tasks yet. Open the task board to create tasks.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tasks.map((task) => {
              const statusMeta = TASK_STATUS_META[task.status];
              const priorityMeta = PRIORITY_META[task.priority];
              return (
                <div key={task.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {task.description}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
                      <User className="h-3 w-3" />
                      {task.assigneeName || "Unassigned"}
                      {task.dueDate && (
                        <>
                          <span className="mx-1">·</span>
                          <Calendar className="h-3 w-3" />
                          Due {task.dueDate}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.color}`}>
                      {priorityMeta.label}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}