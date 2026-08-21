"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Bell, BellRing, CheckCheck, CalendarOff, ListTodo, Wallet, Receipt, Info } from "lucide-react";
import { markNotificationReadAction } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types";
import { toast } from "sonner";

const typeIcons: Record<NotificationType, typeof Info> = {
  leave: CalendarOff,
  task: ListTodo,
  payroll: Wallet,
  expense: Receipt,
  general: Info,
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Resolve current user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // Polling notifications — avoids onSnapshot crash on permission denied
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function fetchNotifications() {
      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", uid)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: AppNotification[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId || "",
            title: data.title || "",
            message: data.message || "",
            type: data.type || "general",
            link: data.link || undefined,
            isRead: data.isRead ?? false,
            created_at:
              data.created_at?.toDate?.()?.toISOString() ||
              data.created_at ||
              new Date().toISOString(),
          });
        });
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setNotifications(list);
      } catch (err) {
        // Permission denied or network error — silently ignore
        console.warn("Notifications fetch skipped:", err);
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [uid]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleClick(notification: AppNotification) {
    // Mark as read (best-effort; only owner can mark own)
    if (!notification.isRead) {
      await markNotificationReadAction(notification.id);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function markAllRead() {
    await Promise.all(
      notifications
        .filter((n) => !n.isRead)
        .map((n) => markNotificationReadAction(n.id))
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-1 w-80 rounded-md border border-[var(--border)]",
            "bg-[var(--popover)] shadow-md sm:w-96"
          )}
          role="menu"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">Notifications</p>
            {notifications.some((n) => !n.isRead) && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Bell className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-[var(--muted-foreground)]">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcons[n.type] ?? Info;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                      "hover:bg-[var(--accent)]",
                      !n.isRead && "bg-[var(--accent)]/60"
                    )}
                    role="menuitem"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                      <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-[var(--foreground)]">
                        {n.title}
                      </span>
                      <span className="block text-xs text-[var(--muted-foreground)] line-clamp-2">
                        {n.message}
                      </span>
                      <span className="mt-1 block text-[10px] text-[var(--muted-foreground)]">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}