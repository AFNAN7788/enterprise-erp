"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Phone, Mail, Calendar, Loader2, Trash2, Plus, X } from "lucide-react";
import type { Interaction, InteractionType, Profile } from "@/types";
import { addInteractionAction, deleteInteractionAction } from "@/app/actions/customers";
import { toast } from "sonner";

const TYPE_META: Record<InteractionType, { label: string; icon: any; color: string }> = {
  call: { label: "Call", icon: Phone, color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  email: { label: "Email", icon: Mail, color: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" },
  meeting: { label: "Meeting", icon: Calendar, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
};

const TYPES: InteractionType[] = ["call", "email", "meeting"];

export default function InteractionTimeline({ customerId }: { customerId: string }) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<InteractionType>("call");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const pSnap = await getDoc(doc(db, "profiles", user.uid));
        if (pSnap.exists()) setUserProfile(pSnap.data() as Profile);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "customers", customerId, "interactions"),
      orderBy("created_at", "desc")
    );
    let cancelled = false;
    async function fetchData() {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: Interaction[] = [];
        snap.forEach((d: any) => list.push({ id: d.id, ...d.data() } as Interaction));
        setInteractions(list);
        setLoading(false);
      } catch (err: any) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [customerId]);

  const isAdmin = userProfile?.role === "admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    setSubmitting(true);
    const res = await addInteractionAction(customerId, { type, subject: subject.trim(), notes: notes.trim() || null });
    if (res.success) {
      toast.success("Interaction logged.");
      setShowForm(false);
      setSubject("");
      setNotes("");
      setType("call");
    } else {
      toast.error(res.error || "Failed to add interaction.");
    }
    setSubmitting(false);
  }

  async function handleDelete(interactionId: string) {
    const res = await deleteInteractionAction(customerId, interactionId);
    if (!res.success) {
      toast.error(res.error || "Failed to delete interaction.");
    }
  }

  function formatDate(ts: any): string {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Interaction Timeline</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Calls, emails, and meetings with this customer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancel" : "Log Interaction"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  type === t
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950"
                    : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="subject" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Subject *
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="e.g. Discussed renewal pricing"
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="Details about this interaction..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Interaction
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div className="p-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : interactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            No interactions logged yet. Click "Log Interaction" to add the first one.
          </p>
        ) : (
          <div className="space-y-4">
            {interactions.map((interaction) => {
              const meta = TYPE_META[interaction.type];
              const Icon = meta.icon;
              return (
                <div key={interaction.id} className="flex gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {interaction.subject}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(interaction.id)}
                        className="rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-900"
                        title="Delete interaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {interaction.notes && (
                      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">{interaction.notes}</p>
                    )}
                    <p className="mt-2 text-[11px] text-zinc-400">
                      {interaction.createdByName || "Unknown"} · {formatDate(interaction.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}