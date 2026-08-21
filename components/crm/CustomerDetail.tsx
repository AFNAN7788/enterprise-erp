"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, query, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { ArrowLeft, Building, Mail, Phone, User, Loader2, Edit2 } from "lucide-react";
import Link from "next/link";
import type { Customer, CustomerStatus, Profile } from "@/types";
import CustomerForm from "./CustomerForm";
import { createCustomerAction, updateCustomerAction } from "@/app/actions/customers";
import { toast } from "sonner";
import InteractionTimeline from "./InteractionTimeline";

const STATUS_META: Record<CustomerStatus, { label: string; color: string }> = {
  lead: { label: "Lead", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
  prospect: { label: "Prospect", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  inactive: { label: "Inactive", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
};

export default function CustomerDetail({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; fullName: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Auth + profile
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

  // Live customer doc
  useEffect(() => {
    let cancelled = false;
    const docRef = doc(db, "customers", customerId);
    async function fetchData() {
      try {
        const snap = await getDoc(docRef);
        if (cancelled) return;
        if (snap.exists()) {
          setCustomer({ id: snap.id, ...snap.data() } as Customer);
        }
        setLoading(false);
      } catch (err) {
        console.warn("Collection fetch skipped:", err);
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [customerId]);

  // Team members for assignment dropdown (admins only)
  useEffect(() => {
    async function fetchTeam() {
      try {
        const snap = await getDocs(query(collection(db, "profiles")));
        const list = snap.docs.map((d) => ({
          id: d.id,
          fullName: d.data().full_name || d.data().email,
        }));
        setTeamMembers(list);
      } catch (err) {
        console.error("Error fetching team members:", err);
      }
    }
    fetchTeam();
  }, []);

  const isAdmin = userProfile?.role === "admin";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Customer not found.</p>
        <Link href="/dashboard/crm" className="mt-2 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
          Back to CRM
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[customer.status];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/crm"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM Board
      </Link>

      {/* Customer header card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {customer.name}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            </div>
            {customer.company && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                <Building className="h-4 w-4" /> {customer.company}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
          >
            <Edit2 className="h-4 w-4" />
            Edit Customer
          </button>
        </div>

        {/* Contact details */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <Mail className="h-3.5 w-3.5" /> Email
            </p>
            <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {customer.email || "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <Phone className="h-3.5 w-3.5" /> Phone
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {customer.phone || "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <User className="h-3.5 w-3.5" /> Assigned To
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {customer.assignedToName || "Unassigned"}
            </p>
          </div>
        </div>

        {/* Notes */}
        {customer.notes && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Notes</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Interaction timeline */}
      <InteractionTimeline customerId={customerId} />

      {/* Edit modal */}
      <CustomerForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        customer={customer}
        teamMembers={teamMembers}
        currentUserId={currentUser?.uid ?? ""}
        isAdmin={isAdmin}
      />
    </div>
  );
}