"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { AttendanceRecord } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  // If provided (HR/Manager view), show a specific employee's attendance
  targetEmployeeId?: string;
  targetEmployeeName?: string;
}

export default function AttendanceCalendar({ targetEmployeeId, targetEmployeeName }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  // Get authenticated user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
    return () => unsub();
  }, []);

  // Fetch attendance records for current month view
  useEffect(() => {
    const empId = targetEmployeeId || uid;
    if (!empId) return;

    setLoading(true);

    const firstDay = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDayNum = new Date(viewYear, viewMonth + 1, 0).getDate();
    const lastDay = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

    const q = query(
      collection(db, "attendance"),
      where("employeeId", "==", empId)
    );

    getDocs(q)
      .then((snap) => {
        const map = new Map<string, AttendanceRecord>();
        snap.forEach((d) => {
          const rec = { id: d.id, ...d.data() } as AttendanceRecord;
          if (rec.date >= firstDay && rec.date <= lastDay) {
            map.set(rec.date, rec);
          }
        });
        setRecords(map);
      })
      .catch((err) => console.error("Attendance fetch error:", err))
      .finally(() => setLoading(false));
  }, [uid, targetEmployeeId, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Calendar grid calculation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function getDayStyle(dateStr: string): string {
    const rec = records.get(dateStr);
    const isToday = dateStr === today.toISOString().split("T")[0];

    if (!rec) {
      // Check if it's a weekday in the past — could be absent
      const d = new Date(dateStr);
      const isPast = d < today && d.toISOString().split("T")[0] !== today.toISOString().split("T")[0];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isPast && !isWeekend) {
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
      }
      if (isWeekend) {
        return "bg-zinc-50 text-zinc-400 dark:bg-zinc-900/30 dark:text-zinc-600";
      }
      return "text-zinc-500 dark:text-zinc-400";
    }
    if (rec.status === "present") return "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/40";
    if (rec.status === "late") return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
    if (rec.status === "absent") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
    return "";
  }

  // Summary counts
  const presentCount = Array.from(records.values()).filter(r => r.status === "present").length;
  const lateCount = Array.from(records.values()).filter(r => r.status === "late").length;
  const absentCount = Array.from(records.values()).filter(r => r.status === "absent").length;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Attendance History
              {targetEmployeeName && (
                <span className="ml-2 text-sm font-normal text-zinc-500">— {targetEmployeeName}</span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="rounded-lg border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-lg border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-800" />Present ({presentCount})
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="h-3 w-3 rounded-sm bg-amber-200 dark:bg-amber-800" />Late ({lateCount})
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="h-3 w-3 rounded-sm bg-red-200 dark:bg-red-800" />Absent / Missed ({absentCount})
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="h-3 w-3 rounded-sm bg-zinc-200 dark:bg-zinc-700" />Weekend
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* Day name headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const rec = records.get(dateStr);
                const isToday = dateStr === today.toISOString().split("T")[0];
                const style = getDayStyle(dateStr);

                return (
                   <div
                     key={day}
                     title={rec ? `${rec.status} | In: ${rec.checkIn ?? "—"} | Out: ${rec.checkOut ?? "—"}${rec.workHours ? ` | ${rec.workHours}h` : ""}` : dateStr}
                     className={`group relative flex h-10 flex-col items-center justify-start rounded-lg border pt-1 transition sm:h-14 ${style} ${
                       isToday ? "ring-2 ring-zinc-900 ring-offset-1 dark:ring-zinc-100" : "border-transparent"
                     }`}
                   >
                    <span className={`text-xs font-semibold ${isToday ? "underline underline-offset-2" : ""}`}>
                      {day}
                    </span>
                    {rec && (
                      <span className="mt-0.5 text-[9px] font-medium capitalize">{rec.status}</span>
                    )}
                    {rec?.workHours && (
                      <span className="text-[9px] opacity-70">{rec.workHours}h</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
