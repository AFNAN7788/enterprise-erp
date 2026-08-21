"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, doc, getDoc, getDocs } from "firebase/firestore";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { auth, db } from "@/lib/firebase/client";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Task, TaskStatus, Profile } from "@/types";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";
import { updateTaskStatusAction, deleteTaskAction } from "@/app/actions/tasks";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "To Do", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
  { status: "in_progress", label: "In Progress", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  { status: "review", label: "Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { status: "done", label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
];

function DroppableColumn({ status, label, color, children }: {
  status: TaskStatus;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition ${
        isOver
          ? "border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/50"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function TaskBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<{ uid: string; name?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const pSnap = await getDoc(doc(db, "profiles", user.uid));
        if (pSnap.exists()) setUserProfile(pSnap.data() as Profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Team members for assignment
  useEffect(() => {
    async function fetchTeam() {
      try {
        const snap = await getDocs(query(collection(db, "profiles")));
        setTeamMembers(snap.docs.map((d) => ({
          id: d.id,
          fullName: d.data().full_name || d.data().email,
        })));
      } catch (err) {
        console.error("Error fetching team members:", err);
      }
    }
    fetchTeam();
  }, []);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [projectId]);

  const canManage = userProfile?.role === "admin" || userProfile?.role === "manager";

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const newStatus = over.id as TaskStatus;
    if (task.status === newStatus) return;

    // Assigned employees can only move their own tasks
    const isAssignee = task.assigneeId === currentUser?.uid;
    if (!canManage && !isAssignee) {
      alert("You can only move your own tasks.");
      return;
    }

    const res = await updateTaskStatusAction(task.id, newStatus);
    if (!res.success) alert(res.error);
  }

  async function handleDelete(id: string) {
    const res = await deleteTaskAction(id);
    if (!res.success) alert(res.error);
    setDeleteConfirmId(null);
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: tasks.filter((t) => t.status === col.status),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Task Board
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Drag tasks between columns to update their status.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {grouped.map((col) => (
              <DroppableColumn key={col.status} status={col.status} label={col.label} color={col.color}>
                {col.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    Drop tasks here
                  </p>
                ) : (
                  col.items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canManage={canManage}
                      onEdit={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ))
                )}
              </DroppableColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="rounded-lg border border-zinc-300 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{activeTask.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create/Edit Modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingTask(null); }}
        projectId={projectId}
        task={editingTask}
        teamMembers={teamMembers}
      />

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Delete Task</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This will permanently delete this task. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}