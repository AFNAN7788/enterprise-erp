"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, ChevronRight, Loader2, ShieldAlert, Activity } from "lucide-react";
import { getActivityLogsAction } from "@/app/actions/activityLogs";
import type { ActivityLogEntry } from "@/app/actions/activityLogs";
import { toast } from "sonner";

const MODULES = ["all", "employees", "attendance", "crm", "projects", "tasks", "inventory", "sales", "finance", "leaves", "documents"];
const ACTIONS = ["all", "create", "update", "delete", "approve", "reject", "checkin", "checkout", "status"];

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  approve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  reject: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  checkin: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  checkout: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  status: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [module, setModule] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const fetchLogs = useCallback(
    async (reset: boolean, lastId?: string | null) => {
      setLoading(true);
      setError("");
      const result = await getActivityLogsAction({
        module,
        action,
        search: search || undefined,
        lastDocId: reset ? null : lastId,
      });
      setLogs((prev) => (reset ? result.logs : [...prev, ...result.logs]));
      setHasMore(result.hasMore);
      setLastDocId(result.lastDocId);
      setLoading(false);
    },
    [module, action, search]
  );

  // Initial load + when filters change
  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  function loadMore() {
    fetchLogs(false, lastDocId);
  }

  // Client-side search filter (search by userId, recordId, or details)
  const filtered = search
    ? logs.filter((log) => {
        const term = search.toLowerCase();
        return (
          log.userId.toLowerCase().includes(term) ||
          (log.recordId || "").toLowerCase().includes(term) ||
          JSON.stringify(log.details).toLowerCase().includes(term)
        );
      })
    : logs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Activity Logs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Admin-only audit trail of all actions across the system.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5" /> Admin Only
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user ID, record ID, or details..."
            className="w-full rounded-lg border border-zinc-300 pl-10 pr-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </form>
        <select
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m === "all" ? "All Modules" : m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? "All Actions" : a.charAt(0).toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {loading && logs.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <Activity className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No activity logs found</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Module</th>
                  <th className="px-6 py-4">Record ID</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                    <td className="whitespace-nowrap px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {log.userId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          actionColors[log.action] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.recordId ? (
                        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {log.recordId.slice(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-6 py-4">
                      <pre className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {JSON.stringify(log.details)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {filtered.length} log{filtered.length !== 1 ? "s" : ""}
          </p>
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}