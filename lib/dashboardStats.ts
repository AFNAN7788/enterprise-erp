import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * ─── Dashboard Stats Aggregator (SERVER-ONLY) ─────────────────────────────────
 *
 * Computes summary documents into the `dashboardStats` collection for fast reads.
 * This is the ONLY place dashboardStats documents are written (via Admin SDK).
 *
 * Document structure:
 *   dashboardStats/company            → company-wide stats (Admin)
 *   dashboardStats/team_{managerId}   → per-manager team stats
 *   dashboardStats/user_{uid}         → per-employee personal stats
 *
 * The Cloud Function (functions/index.js) calls this on a schedule.
 * The server action refreshDashboardStatsAction() also calls it on-demand.
 */

export interface DashboardStats {
  totalEmployees: number;
  pendingLeaves: number;
  activeProjects: number;
  lowStockItems: number;
  monthlySales: number;
  monthlyExpenses: number;
  attendanceTrend: { month: string; present: number; late: number }[];
  salesTrend: { month: string; total: number }[];
  expenseByCategory: { category: string; amount: number }[];
  projectStatus: { status: string; count: number }[];
  updated_at: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  return monthKey(new Date());
}

function emptyStats(): DashboardStats {
  return {
    totalEmployees: 0,
    pendingLeaves: 0,
    activeProjects: 0,
    lowStockItems: 0,
    monthlySales: 0,
    monthlyExpenses: 0,
    attendanceTrend: MONTHS.map((m) => ({ month: m, present: 0, late: 0 })),
    salesTrend: MONTHS.map((m) => ({ month: m, total: 0 })),
    expenseByCategory: [],
    projectStatus: [],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Compute company-wide stats and write to dashboardStats/company
 */
export async function computeCompanyStats(): Promise<DashboardStats> {
  const stats = emptyStats();
  const cmk = currentMonthKey();

  // Run all Firestore queries in parallel for speed
  const [empSnap, leaveSnap, projSnap, productsSnap, salesSnap, expSnap, projAllSnap] =
    await Promise.all([
      adminDb.collection("employees").where("status", "==", "active").get(),
      adminDb.collection("leaveRequests").where("status", "==", "pending").get(),
      adminDb.collection("projects").where("status", "==", "active").get(),
      adminDb.collection("products").get(),
      adminDb.collection("salesOrders").get(),
      adminDb.collection("expenses").get(),
      adminDb.collection("projects").get(),
    ]);

  // Total employees (active)
  stats.totalEmployees = empSnap.size;

  // Pending leaves
  stats.pendingLeaves = leaveSnap.size;

  // Active projects
  stats.activeProjects = projSnap.size;

  // Low stock items (quantity <= reorderLevel)
  let lowStock = 0;
  productsSnap.forEach((doc) => {
    const d = doc.data();
    if ((d.quantity ?? 0) <= (d.reorderLevel ?? 0)) lowStock++;
  });
  stats.lowStockItems = lowStock;

  // Monthly sales (this month) + sales trend
  let monthlySales = 0;
  const salesTrend = MONTHS.map((m) => ({ month: m, total: 0 }));
  salesSnap.forEach((doc) => {
    const d = doc.data();
    const created = d.created_at?.toDate?.() || new Date(d.created_at);
    if (created && !Number.isNaN(created.getTime())) {
      const mk = monthKey(created);
      const monthIdx = created.getMonth();
      const total = d.total || 0;
      salesTrend[monthIdx].total += total;
      if (mk === cmk) monthlySales += total;
    }
  });
  stats.salesTrend = salesTrend;
  stats.monthlySales = monthlySales;

  // Monthly expenses + breakdown by category
  let monthlyExpenses = 0;
  const catMap: Record<string, number> = {};
  expSnap.forEach((doc) => {
    const d = doc.data();
    const created = d.created_at?.toDate?.() || new Date(d.created_at);
    const amount = d.amount || 0;
    if (created && !Number.isNaN(created.getTime())) {
      if (monthKey(created) === cmk) monthlyExpenses += amount;
    }
    const cat = d.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + amount;
  });
  stats.monthlyExpenses = monthlyExpenses;
  stats.expenseByCategory = Object.entries(catMap).map(([category, amount]) => ({ category, amount }));

  // Project status distribution
  const statusMap: Record<string, number> = {};
  projAllSnap.forEach((doc) => {
    const status = doc.data().status || "unknown";
    statusMap[status] = (statusMap[status] || 0) + 1;
  });
  stats.projectStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // Write to dashboardStats/company
  await adminDb.collection("dashboardStats").doc("company").set({
    ...stats,
    scope: "company",
    updated_at: FieldValue.serverTimestamp(),
  });

  return stats;
}

/**
 * Compute team stats for a manager and write to dashboardStats/team_{managerId}
 */
export async function computeTeamStats(managerId: string): Promise<DashboardStats> {
  const stats = emptyStats();
  const cmk = currentMonthKey();

  // Run all queries in parallel
  const [teamSnap, leaveSnap, salesSnap, expSnap, productsSnap] =
    await Promise.all([
      adminDb.collection("employees").where("managerId", "==", managerId).get(),
      adminDb.collection("leaveRequests").where("status", "==", "pending").get(),
      adminDb.collection("salesOrders").get(),
      adminDb.collection("expenses").get(),
      adminDb.collection("products").get(),
    ]);

  const teamProfileIds = new Set<string>();
  teamSnap.forEach((doc) => {
    const d = doc.data();
    if (d.status === "active") stats.totalEmployees++;
    if (d.profileId) teamProfileIds.add(d.profileId);
  });

  // Pending leaves for team
  leaveSnap.forEach((doc) => {
    const d = doc.data();
    if (teamProfileIds.has(d.employeeId)) stats.pendingLeaves++;
  });

  // Team projects
  const projSnap = await adminDb.collection("projects").where("managerId", "==", managerId).get();
  projSnap.forEach((doc) => {
    if (doc.data().status === "active") stats.activeProjects++;
  });

  const statusMap: Record<string, number> = {};
  projSnap.forEach((doc) => {
    const status = doc.data().status || "unknown";
    statusMap[status] = (statusMap[status] || 0) + 1;
  });
  stats.projectStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // Monthly sales for team
  const salesTrend = MONTHS.map((m) => ({ month: m, total: 0 }));
  salesSnap.forEach((doc) => {
    const d = doc.data();
    if (!teamProfileIds.has(d.createdBy)) return;
    const created = d.created_at?.toDate?.() || new Date(d.created_at);
    if (created && !Number.isNaN(created.getTime())) {
      const monthIdx = created.getMonth();
      salesTrend[monthIdx].total += d.total || 0;
      if (monthKey(created) === cmk) stats.monthlySales += d.total || 0;
    }
  });
  stats.salesTrend = salesTrend;

  // Monthly expenses for team
  const catMap: Record<string, number> = {};
  expSnap.forEach((doc) => {
    const d = doc.data();
    if (!teamProfileIds.has(d.submittedBy)) return;
    const created = d.created_at?.toDate?.() || new Date(d.created_at);
    const amount = d.amount || 0;
    if (created && !Number.isNaN(created.getTime()) && monthKey(created) === cmk) {
      stats.monthlyExpenses += amount;
    }
    const cat = d.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + amount;
  });
  stats.expenseByCategory = Object.entries(catMap).map(([category, amount]) => ({ category, amount }));

  // Low stock
  let lowStock = 0;
  productsSnap.forEach((doc) => {
    const d = doc.data();
    if ((d.quantity ?? 0) <= (d.reorderLevel ?? 0)) lowStock++;
  });
  stats.lowStockItems = lowStock;

  await adminDb.collection("dashboardStats").doc(`team_${managerId}`).set({
    ...stats,
    scope: "team",
    managerId,
    updated_at: FieldValue.serverTimestamp(),
  });

  return stats;
}

/**
 * Compute personal stats for an employee and write to dashboardStats/user_{uid}
 */
export async function computeUserStats(uid: string): Promise<DashboardStats> {
  const stats = emptyStats();
  const cmk = currentMonthKey();

  // Run all queries in parallel
  const [attSnap, leaveSnap, projSnap, expSnap, paySnap] =
    await Promise.all([
      adminDb.collection("attendance").where("employeeId", "==", uid).get(),
      adminDb.collection("leaveRequests").where("employeeId", "==", uid).where("status", "==", "pending").get(),
      adminDb.collection("projects").get(),
      adminDb.collection("expenses").where("submittedBy", "==", uid).get(),
      adminDb.collection("payroll").where("employeeId", "==", uid).get(),
    ]);

  // Personal attendance trend
  const attendanceTrend = MONTHS.map((m) => ({ month: m, present: 0, late: 0 }));
  attSnap.forEach((doc) => {
    const d = doc.data();
    const dateStr = d.date;
    if (dateStr) {
      const dateObj = new Date(dateStr);
      const monthIdx = dateObj.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        if (d.status === "present") attendanceTrend[monthIdx].present++;
        if (d.status === "late") attendanceTrend[monthIdx].late++;
      }
    }
  });
  stats.attendanceTrend = attendanceTrend;

  // Personal pending leaves
  stats.pendingLeaves = leaveSnap.size;

  // Personal active projects (as team member)
  let activeProjects = 0;
  const statusMap: Record<string, number> = {};
  projSnap.forEach((doc) => {
    const d = doc.data();
    const team = d.teamMembers || [];
    if (team.includes(uid)) {
      if (d.status === "active") activeProjects++;
      const status = d.status || "unknown";
      statusMap[status] = (statusMap[status] || 0) + 1;
    }
  });
  stats.activeProjects = activeProjects;
  stats.projectStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // Personal monthly expenses
  const catMap: Record<string, number> = {};
  expSnap.forEach((doc) => {
    const d = doc.data();
    const created = d.created_at?.toDate?.() || new Date(d.created_at);
    const amount = d.amount || 0;
    if (created && !Number.isNaN(created.getTime()) && monthKey(created) === cmk) {
      stats.monthlyExpenses += amount;
    }
    const cat = d.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + amount;
  });
  stats.expenseByCategory = Object.entries(catMap).map(([category, amount]) => ({ category, amount }));

  // Personal payroll
  const salesTrend = MONTHS.map((m) => ({ month: m, total: 0 }));
  paySnap.forEach((doc) => {
    const d = doc.data();
    const monthIdx = (d.month || 1) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      salesTrend[monthIdx].total += d.netSalary || 0;
      if (d.month === new Date().getMonth() + 1 && d.year === new Date().getFullYear()) {
        stats.monthlySales += d.netSalary || 0;
      }
    }
  });
  stats.salesTrend = salesTrend;
  stats.lowStockItems = 0;

  await adminDb.collection("dashboardStats").doc(`user_${uid}`).set({
    ...stats,
    scope: "user",
    userId: uid,
    updated_at: FieldValue.serverTimestamp(),
  });

  return stats;
}