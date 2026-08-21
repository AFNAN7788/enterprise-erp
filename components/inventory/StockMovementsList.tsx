"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import type { StockMovement } from "@/types";

export default function StockMovementsList() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Live movements history
  useEffect(() => {
    const q = query(collection(db, "stockMovements"), orderBy("created_at", "desc"));
    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: StockMovement[] = [];
        snap.forEach((d) => {
          const m = { id: d.id, ...d.data() } as StockMovement;
          list.push(m);
        });
        setMovements(list);

        // Resolve product names
        const ids = Array.from(new Set(list.map((m) => m.productId)));
        const resolved: Record<string, string> = {};
        await Promise.all(
          ids.map(async (pid) => {
            try {
              const pDoc = await getDoc(doc(db, "products", pid));
              const data = pDoc.data() as { name?: string } | undefined;
              resolved[pid] = pDoc.exists() ? data?.name || pid : pid;
            } catch {
              resolved[pid] = pid;
            }
          })
        );
        if (cancelled) return;
        setProductNames(resolved);
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-400">No stock movements recorded yet.</p>
      </div>
    );
  }

  function formatDate(ts: any): string {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Stock Movement History</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Recent stock-in and stock-out records.
        </p>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {movements.map((m) => (
          <div key={m.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  m.type === "in"
                    ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {m.type === "in" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {productNames[m.productId] || m.productId}
                </p>
                {m.reason && <p className="text-xs text-zinc-500">{m.reason}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  m.type === "in"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {m.type === "in" ? "+" : "-"}{m.quantity}
              </span>
              <span className="text-[11px] text-zinc-400">
                {m.createdByName || "Unknown"} · {formatDate(m.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}