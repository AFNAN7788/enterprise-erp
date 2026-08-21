"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { FileText, FileArchive, FileImage, FileSpreadsheet, File, Download, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { deleteDocumentAction } from "@/app/actions/documents";
import type { DocumentFile } from "@/types";

interface DocumentListProps {
  /** Filter by module — e.g. "employee", "project", "expense" */
  relatedModule?: string;
  /** Filter by related record ID */
  relatedId?: string;
  /** Limit to the current user's own files (used on the generic documents page) */
  showOwnOnly?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function fileIcon(mimeType: string, name: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4" />;
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z"))
    return <FileArchive className="h-4 w-4" />;
  if (mimeType.includes("sheet") || name.endsWith(".csv")) return <FileSpreadsheet className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

export default function DocumentList({ relatedModule, relatedId, showOwnOnly = false }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("employee");
  const [loading, setLoading] = useState(true);

  // Resolve current user + role from profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUid(user?.uid ?? null);
      if (user) {
        try {
          const profileSnap = await import("firebase/firestore").then(({ doc, getDoc }) =>
            getDoc(doc(db, "profiles", user.uid))
          );
          if (profileSnap.exists()) {
            setUserRole(profileSnap.data().role || "employee");
          }
        } catch {
          // ignore
        }
      }
    });
    return () => unsub();
  }, []);

  // Fetch documents
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    // Employees can only query their own docs (matches Firestore rules).
    // Admin/HR query all docs.
    const baseQuery =
      userRole === "admin" || userRole === "hr"
        ? collection(db, "documents")
        : query(collection(db, "documents"), where("uploadedBy", "==", uid));

    const q = baseQuery;

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: DocumentFile[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name || "Untitled",
            fileName: data.fileName || "",
            storagePath: data.storagePath || "",
            downloadURL: data.downloadURL || "",
            mimeType: data.mimeType || "",
            size: data.size || 0,
            uploadedBy: data.uploadedBy || "",
            uploadedByName: data.uploadedByName || "Unknown",
            relatedModule: data.relatedModule || undefined,
            relatedId: data.relatedId || undefined,
            created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || "",
          });
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDocuments(list);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid, userRole]);

  // Apply filters (module/record filters happen client-side)
  const isAdminOrHR = userRole === "admin" || userRole === "hr";
  const filtered = documents.filter((doc) => {
    // Module filter
    if (relatedModule && doc.relatedModule !== relatedModule) return false;
    if (relatedId && doc.relatedId !== relatedId) return false;
    // Own-only filter (applies unless the viewer is admin/hr)
    if (showOwnOnly && !isAdminOrHR && uid && doc.uploadedBy !== uid) return false;
    if (showOwnOnly && !uid) return false;
    return true;
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this file permanently?")) return;
    try {
      const res = await deleteDocumentAction(id);
      if (!res.success) {
        toast.error(res.error);
      } else {
        toast.success("File deleted successfully");
      }
    } catch {
      toast.error("Failed to delete file.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Loading documents...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-center">
          <FolderOpen className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No documents found</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Upload a file to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4">File</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Uploaded By</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.map((doc) => {
                const canDelete = isAdminOrHR || (uid && doc.uploadedBy === uid);
                return (
                  <tr key={doc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                          {fileIcon(doc.mimeType, doc.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{doc.name}</p>
                          {doc.relatedId && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">ID: {doc.relatedId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {doc.relatedModule || "General"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{doc.uploadedByName}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatBytes(doc.size)}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatDate(doc.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={doc.downloadURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          aria-label={`Download ${doc.name}`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                            aria-label={`Delete ${doc.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}