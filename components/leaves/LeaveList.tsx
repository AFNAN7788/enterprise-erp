"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  type Query,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LeaveRequest, Profile } from "@/types";
import { toast } from "sonner";
import { approveLeaveRequestAction, rejectLeaveRequestAction } from "@/app/actions/leaves";

interface Props {
  /** If true, hides approve/reject buttons — for employee-facing view */
  readOnly?: boolean;
  /** If set, only loads this specific employee's requests (HR reviewing one employee) */
  targetEmployeeId?: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  unpaid: "Unpaid Leave",
};

export default function LeaveList({ readOnly = false, targetEmployeeId }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // requestId being actioned
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState<Record<string, string>>({});

  // Auth + profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const pSnap = await getDoc(doc(db, "profiles", user.uid));
      if (pSnap.exists()) setUserProfile(pSnap.data() as Profile);
    });
    return () => unsub();
  }, []);

  // Live Firestore query
  useEffect(() => {
    if (!uid || !userProfile) return;

    const role = userProfile.role;
    let q: Query = collection(db, "leaveRequests");

    if (targetEmployeeId) {
      q = query(
        q,
        where("employeeId", "==", targetEmployeeId)
      );
    } else if (role === "admin" || role === "hr") {
      q = query(
        q
      );
    } else if (role === "manager") {
      q = query(
        q,
        where("managerId", "==", uid)
      );
    } else {
      q = query(
        q,
        where("employeeId", "==", uid)
      );
    }

    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const items: LeaveRequest[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() } as LeaveRequest));
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRequests(items);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid, userProfile, targetEmployeeId]);

  async function handleApprove(requestId: string) {
    setActionLoading(requestId);
    const note = reviewNoteInput[requestId] || "";
    const res = await approveLeaveRequestAction(requestId, note);
    if (!res.success) {
      toast.error(res.error);
    } else {
      toast.success("Leave request approved successfully");
    }
    setActionLoading(null);
    setExpandedId(null);
  }

  async function handleReject(requestId: string) {
    setActionLoading(requestId);
    const note = reviewNoteInput[requestId] || "";
    if (!note.trim()) {
      toast.error("Please provide a reason for rejection.");
      setActionLoading(null);
      return;
    }
    const res = await rejectLeaveRequestAction(requestId, note);
    if (!res.success) {
      toast.error(res.error);
    } else {
      toast.success("Leave request rejected");
    }
    setActionLoading(null);
    setExpandedId(null);
  }

  // Role-based: can this user approve/reject?
  const canReview = !readOnly && (
    userProfile?.role === "admin" ||
    userProfile?.role === "hr" ||
    userProfile?.role === "manager"
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Clock className="mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
        <p className="text-sm font-semibold text-zinc-500">No leave requests found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isExpanded = expandedId === req.id;
        const isPending = req.status === "pending";

        return (
          <div
            key={req.id}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            {/* Main Row */}
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {req.status === "approved" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  {req.status === "rejected" && <XCircle className="h-5 w-5 text-red-500" />}
                  {req.status === "pending" && <Clock className="h-5 w-5 text-amber-500" />}
                </div>

                <div>
                  {/* If HR/Manager view — show employee name */}
                  {canReview && !targetEmployeeId && (
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {req.employeeName}
                    </p>
                  )}
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {LEAVE_TYPE_LABELS[req.type] ?? req.type}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {req.startDate} → {req.endDate}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {req.reason}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  req.status === "approved"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : req.status === "rejected"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    req.status === "approved" ? "bg-green-500"
                    : req.status === "rejected" ? "bg-red-500"
                    : "bg-amber-500"
                  }`} />
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </span>

                {/* Expand/Collapse for pending requests */}
                {canReview && isPending && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Review
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}

                {/* Reviewer info if reviewed */}
                {req.reviewedBy && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    by {req.reviewerName || "Reviewer"}
                  </p>
                )}
              </div>
            </div>

            {/* Review Note (if rejected) */}
            {req.reviewNote && !isExpanded && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold">Note:</span> {req.reviewNote}
                </p>
              </div>
            )}

            {/* Expanded Review Panel */}
            {canReview && isPending && isExpanded && (
              <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
                  Review Note (required for rejection)
                </label>
                <textarea
                  rows={2}
                  value={reviewNoteInput[req.id] || ""}
                  onChange={(e) => setReviewNoteInput(prev => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="Add a note for the employee..."
                  className="mb-3 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                  <button
                    onClick={() => setExpandedId(null)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
