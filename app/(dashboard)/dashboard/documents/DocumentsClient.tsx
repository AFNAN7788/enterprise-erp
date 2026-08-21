"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Upload, Trash2, Search, Download, Folder, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";
import { deleteDocumentAction } from "@/app/actions/documents";

interface Document {
  id: string;
  title: string;
  type: string;
  category: string;
  uploadedBy: string;
  uploadedByName: string;
  created_at: string;
  url?: string;
  size?: string;
  description?: string;
}

const CATEGORIES = ["All", "HR", "Finance", "Projects", "Legal", "General"] as const;

export default function DocumentsClient({ role }: { role: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDocs(collection(db, "documents"));
        const docs: Document[] = [];
        snap.forEach((d) => {
          const data = d.data();
          docs.push({
            id: d.id,
            title: data.title || "Untitled",
            type: data.type || "file",
            category: data.category || "General",
            uploadedBy: data.uploadedBy || "",
            uploadedByName: data.uploadedByName || "Unknown",
            created_at: data.created_at || "",
            url: data.url,
            size: data.size,
            description: data.description,
          });
        });
        setDocuments(docs);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filtered = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteDocumentAction(id);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        toast.success("Document deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const typeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return "bg-red-100 text-red-700";
      case "doc":
      case "docx":
        return "bg-blue-100 text-blue-700";
      case "xls":
      case "xlsx":
        return "bg-green-100 text-green-700";
      case "img":
      case "image":
      case "jpg":
      case "png":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Documents</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Upload and manage company documents.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Documents</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {role === "admin" || role === "hr"
              ? "Upload and manage all company documents."
              : "Upload your documents. Admin and HR can see all files."}
          </p>
        </div>
        <button
          onClick={() => toast("Upload feature coming soon")}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{documents.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {CATEGORIES.slice(1).map((cat) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--muted)] p-2">
                  <Folder className="h-5 w-5 text-[var(--muted-foreground)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{categoryCounts[cat] || 0}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{cat}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-[var(--primary)]" />
            Documents ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-[var(--muted-foreground)] mb-4" />
              <p className="text-sm font-medium text-[var(--foreground)]">No documents found</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {documents.length === 0
                  ? "No documents have been uploaded yet."
                  : "No documents match your search or filter criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Document</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Uploaded By</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-[var(--muted)] p-2">
                            <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeColor(doc.type)}`}>
                          {doc.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{doc.category}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{doc.uploadedByName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {doc.url && (
                            <>
                              <button
                                onClick={() => window.open(doc.url, "_blank")}
                                className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = doc.url!;
                                  a.download = doc.title;
                                  a.click();
                                }}
                                className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {confirmDeleteId === doc.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(doc.id)}
                                disabled={deletingId === doc.id}
                                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingId === doc.id ? "..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(doc.id)}
                              className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
