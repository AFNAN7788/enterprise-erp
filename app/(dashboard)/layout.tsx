import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check session cookie — if missing, redirect to login
  // (Full profile fetch happens client-side in DashboardShell via Firebase Auth)
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
