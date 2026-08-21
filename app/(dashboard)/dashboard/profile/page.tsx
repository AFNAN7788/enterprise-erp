"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Mail, Shield, Calendar, Edit2, Save, X } from "lucide-react";
import type { Profile } from "@/types";
import { toast } from "sonner";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "profiles", user.uid));
        if (profileSnap.exists()) {
          setProfile({ id: user.uid, ...profileSnap.data() } as Profile);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!profile || !editName.trim()) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      await updateDoc(doc(db, "profiles", user.uid), {
        full_name: editName.trim(),
        updated_at: new Date().toISOString(),
      });
      setProfile({ ...profile, full_name: editName.trim() });
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setEditName(profile?.full_name || "");
    setEditing(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[var(--muted-foreground)]">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-[var(--muted-foreground)]">No profile data found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            My Profile
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            View and manage your account information.
          </p>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-zinc-50 dark:text-zinc-950"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xl font-bold">
              {profile.full_name
                ? profile.full_name.charAt(0).toUpperCase()
                : profile.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white text-zinc-950 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                    placeholder="Enter your name"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-lg text-[var(--card-foreground)]">
                    {profile.full_name ?? "Unnamed User"}
                  </CardTitle>
                  <p className="text-sm text-[var(--muted-foreground)]">{profile.email}</p>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-4">
              <User className="h-5 w-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Full Name</p>
                <p className="text-sm font-medium text-[var(--card-foreground)]">
                  {profile.full_name ?? "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-4">
              <Mail className="h-5 w-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Email</p>
                <p className="text-sm font-medium text-[var(--card-foreground)]">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-4">
              <Shield className="h-5 w-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Role</p>
                <p className="text-sm font-medium capitalize text-[var(--card-foreground)]">
                  {profile.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-4">
              <Calendar className="h-5 w-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Joined</p>
                <p className="text-sm font-medium text-[var(--card-foreground)]">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
