import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NexGen ERP — Auth",
  description: "Sign in or create an account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
            NexGen ERP
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Enterprise Resource Planning System
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-[var(--card)] text-[var(--card-foreground)] rounded-lg border border-[var(--border)] shadow-sm p-8"
          role="main"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
