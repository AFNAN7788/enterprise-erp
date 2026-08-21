"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { toast } from "sonner";
import { checkInAction, checkOutAction } from "@/app/actions/attendance";
import { LogIn, LogOut, Clock, CheckCircle2, Loader2 } from "lucide-react";
import type { AttendanceRecord } from "@/types";

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayH = hour % 12 || 12;
  return `${displayH}:${m} ${ampm}`;
}

export default function CheckInOut() {
  const [uid, setUid] = useState<string | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
      if (!user) setLoading(false);
    });
    return () => unsub();
  }, []);

  // Live attendance record for today
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const today = todayDateString();
    const docRef = doc(db, "attendance", `${uid}_${today}`);
    async function fetchData() {
      try {
        const snap = await getDoc(docRef);
        if (cancelled) return;
        setRecord(snap.exists() ? ({ id: snap.id, ...snap.data() } as AttendanceRecord) : null);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid]);

  async function handleCheckIn() {
    setActionLoading(true);
    const res = await checkInAction();
    if (res.success) {
      toast.success(`Checked in at ${formatTime(res.checkIn!)} — Status: ${res.status}`);
    } else {
      toast.error(res.error!);
    }
    setActionLoading(false);
  }

  async function handleCheckOut() {
    setActionLoading(true);
    const res = await checkOutAction();
    if (res.success) {
      toast.success(`Checked out at ${formatTime(res.checkOut!)} — ${res.workHours}h worked`);
    } else {
      toast.error(res.error!);
    }
    setActionLoading(false);
  }

  const timeStr = currentTime.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = currentTime.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const isCheckedIn = !!record?.checkIn;
  const isCheckedOut = !!record?.checkOut;
  const isDone = isCheckedIn && isCheckedOut;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Today&apos;s Attendance
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{dateStr}</p>
          </div>
          {/* Live Clock */}
          <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 dark:bg-zinc-800">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span className="font-mono text-sm font-semibold text-white">{timeStr}</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Status Row */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Check In</p>
            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {formatTime(record?.checkIn ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Check Out</p>
            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {formatTime(record?.checkOut ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</p>
            <p className="mt-1">
              {!record ? (
                <span className="text-sm font-semibold text-zinc-400">Not Marked</span>
              ) : record.status === "present" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Present
                </span>
              ) : record.status === "late" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Late
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Absent
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Work Hours */}
        {record?.workHours != null && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/40 dark:bg-green-950/20">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              ✅ Total work hours today: <strong>{record.workHours} hours</strong>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={isCheckedIn || actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {actionLoading && !isCheckedIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isCheckedIn ? "Checked In ✓" : "Check In"}
          </button>

          <button
            type="button"
            onClick={handleCheckOut}
            disabled={!isCheckedIn || isDone || actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {actionLoading && isCheckedIn && !isDone ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {isDone ? "Checked Out ✓" : "Check Out"}
          </button>
        </div>

        {isDone && (
          <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Attendance marked for today. See you tomorrow! 👋
          </p>
        )}
      </div>
    </div>
  );
}
