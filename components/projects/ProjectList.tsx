"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, doc, getDoc, getDocs, type Query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Plus, Edit2, Trash2, Loader2, Building, User, FolderKanban, Calendar } from "lucide-react";
import Link from "next/link";
import type { Project, ProjectStatus, Profile } from "@/types";
import ProjectForm from "./ProjectForm";
import { deleteProjectAction } from "@/app/actions/projects";

const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  planning: { label: "Planning", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  completed: { label: "Completed", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
};

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; fullName: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email?: string | null; name?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Fetch clients (CRM), managers, and team members
  useEffect(() => {
    async function fetchData() {
      try {
        const [clientSnap, profileSnap] = await Promise.all([
          getDocs(query(collection(db, "customers"))),
          getDocs(query(collection(db, "profiles"))),
        ]);
        setClients(clientSnap.docs.map((d) => ({ id: d.id, name: d.data().name || "Unknown" })));
        const profiles = profileSnap.docs.map((d) => ({
          id: d.id,
          fullName: d.data().full_name || d.data().email,
          role: d.data().role,
        }));
        setManagers(profiles.filter((p) => p.role === "admin" || p.role === "manager"));
        setTeamMembers(profiles);
      } catch (err) {
        console.warn("Error fetching project form data:", err);
      }
    }
    fetchData();
  }, []);

  // Live projects — non-admin/manager only see their team projects
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    let q: Query = collection(db, "projects");
    if (userProfile.role !== "admin" && userProfile.role !== "manager") {
      q = query(q, where("teamMembers", "array-contains", currentUser?.uid));
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Project[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Project));
        setProjects(list);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentUser, userProfile]);

  const canManage = userProfile?.role === "admin" || userProfile?.role === "manager";

  async function handleDelete(id: string) {
    setActionLoading(true);
    const res = await deleteProjectAction(id);
    if (!res.success) alert(res.error);
    setDeleteConfirmId(null);
    setActionLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage projects, linked clients, and team tasks.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => { setEditingProject(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        )}
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <FolderKanban className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm font-semibold text-zinc-500">No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const statusMeta = STATUS_META[project.status];
            return (
              <div key={project.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/projects/${project.id}`} className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{project.name}</p>
                    {project.clientName && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                        <Building className="h-3 w-3" /> {project.clientName}
                      </p>
                    )}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setEditingProject(project); setIsFormOpen(true); }}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(project.id)}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-900"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {project.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {project.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.color}`}>
                    {statusMeta.label}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <User className="h-3 w-3" />
                    {project.managerName || "Unassigned"}
                  </span>
                </div>

                <Link
                  href={`/dashboard/projects/${project.id}/tasks`}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Open Task Board
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <ProjectForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProject(null); }}
        project={editingProject}
        clients={clients}
        managers={managers}
        teamMembers={teamMembers}
      />

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Delete Project</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This will permanently delete the project and all its tasks. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={actionLoading}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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