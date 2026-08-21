"use client";

import { useDraggable } from "@dnd-kit/core";
import { Edit2, Trash2, User, Calendar } from "lucide-react";
import type { Task, TaskPriority } from "@/types";

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
  medium: { label: "Medium", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  high: { label: "High", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

interface Props {
  task: Task;
  canManage: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, canManage, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const priorityMeta = PRIORITY_META[task.priority];

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-950 ${
        isDragging ? "opacity-50 ring-2 ring-zinc-400" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{task.title}</p>
        <div className="flex shrink-0 gap-1">
          {canManage && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-900"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{task.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityMeta.color}`}>
          {priorityMeta.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
          <User className="h-3 w-3" />
          {task.assigneeName || "Unassigned"}
        </span>
      </div>

      {task.dueDate && (
        <p className="mt-2 flex items-center gap-1 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400 dark:border-zinc-800">
          <Calendar className="h-3 w-3" />
          Due {task.dueDate}
        </p>
      )}
    </div>
  );
}