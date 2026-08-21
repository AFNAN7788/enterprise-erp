"use client";

import { useState } from "react";
import Link from "next/link";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      setResult({
        success: res.ok,
        message: res.ok ? "Admin created! You can now login." : data.error,
      });
    } catch {
      setResult({ success: false, message: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--card-foreground)] mb-2">System Setup</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          Create the first admin user. Only run this once.
        </p>

        {result && (
          <div
            className={`mb-4 rounded-md p-3 text-sm ${
              result.success
                ? "bg-green-50 border border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                : "bg-red-50 border border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
            }`}
          >
            {result.message}
          </div>
        )}

        {!result?.success && (
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Admin User"}
            </button>
          </form>
        )}

        {result?.success && (
          <Link
            href="/login"
            className="mt-4 block text-center text-sm font-medium text-[var(--primary)] underline underline-offset-4 hover:opacity-75"
          >
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}
