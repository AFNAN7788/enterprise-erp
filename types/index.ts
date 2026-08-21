import type { ComponentType } from "react";

export type UserRole = "admin" | "hr" | "manager" | "employee";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface SidebarProps {
  userRole: UserRole;
  isOpen: boolean;
  onToggle: () => void;
}

export interface Employee {
  id: string;          // Firestore Document ID
  profileId: string;   // Reference to profiles/{userId}
  fullName: string;    // Cached for quick queries
  email: string;       // Cached for quick queries
  phone?: string;
  department: string;
  position: string;
  status: "active" | "inactive";
  managerId?: string;  // Reference to profiles/{managerId}
  salary?: number;
  hireDate: string;    // ISO Date String (e.g. YYYY-MM-DD)
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;              // Firestore Document ID
  employeeId: string;      // Firebase Auth UID (profiles/{uid})
  employeeName: string;    // Cached full name
  managerId?: string;      // Manager's UID — for manager-scoped queries
  date: string;            // YYYY-MM-DD — one doc per employee per day
  checkIn: string | null;  // HH:MM (24h)
  checkOut: string | null; // HH:MM (24h) — null if not checked out yet
  status: "present" | "absent" | "late";
  workHours?: number;      // Calculated after checkout
  created_at: string;
  updated_at: string;
}

export type LeaveType = "sick" | "casual" | "annual" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;      // Firebase Auth UID
  employeeName: string;    // Cached full name
  managerId?: string;      // Manager's UID — for manager-scoped queries
  type: LeaveType;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;     // HR/Manager UID who approved/rejected
  reviewerName?: string;
  reviewNote?: string;
  created_at: string;
  updated_at: string;
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export type CustomerStatus = "lead" | "prospect" | "active" | "inactive";

export interface Customer {
  id: string;              // Firestore Document ID
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: CustomerStatus;
  assignedTo: string;      // Firebase Auth UID of the assigned team member
  assignedToName?: string; // Cached name for display
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type InteractionType = "call" | "email" | "meeting";

export interface Interaction {
  id: string;              // Firestore Document ID
  customerId: string;      // Parent customer doc ID
  type: InteractionType;
  subject: string;
  notes?: string;
  createdBy: string;       // Firebase Auth UID
  createdByName?: string;  // Cached name
  created_at: string;
}

// ─── Projects & Tasks ─────────────────────────────────────────────────────────

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export interface Project {
  id: string;              // Firestore Document ID
  name: string;
  description?: string;
  status: ProjectStatus;
  clientId?: string;       // Reference to customers/{customerId}
  clientName?: string;     // Cached client name for display
  managerId: string;       // Firebase Auth UID of the project manager
  managerName?: string;    // Cached manager name
  teamMembers?: string[];  // Firebase Auth UIDs of assigned team members
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;              // Firestore Document ID
  projectId: string;          // Reference to projects/{projectId}
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;     // Firebase Auth UID
  assigneeName?: string;   // Cached name
  dueDate?: string;        // YYYY-MM-DD
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface Product {
  id: string;              // Firestore Document ID
  name: string;
  sku?: string;
  description?: string;
  category: string;
  quantity: number;
  unit?: string;           // e.g. "pcs", "kg", "boxes"
  reorderLevel: number;
  created_at: string;
  updated_at: string;
}

export type StockMovementType = "in" | "out";

export interface StockMovement {
  id: string;              // Firestore Document ID
  productId: string;       // Reference to products/{productId}
  type: StockMovementType;
  quantity: number;        // Positive number
  reason?: string;
  createdByName?: string;  // Cached user name
  created_at: string;
}

// ─── Sales & Purchase Orders ──────────────────────────────────────────────────

export type OrderStatus = "pending" | "completed" | "cancelled";

export interface OrderItem {
  productId: string;       // Reference to products/{productId}
  productName: string;     // Cached product name
  quantity: number;
  unitPrice: number;
  lineTotal: number;       // quantity * unitPrice
}

export interface SalesOrder {
  id: string;              // Firestore Document ID
  orderNumber: string;
  customerId?: string;     // Reference to customers/{customerId}
  customerName?: string;   // Cached client name
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdBy: string;       // Firebase Auth UID
  createdByName?: string;  // Cached user name
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;              // Firestore Document ID
  orderNumber: string;
  supplier?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdBy: string;       // Firebase Auth UID
  createdByName?: string;  // Cached user name
  created_at: string;
  updated_at: string;
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;              // Firestore Document ID
  category: string;        // e.g. "Travel", "Office Supplies", "Utilities"
  amount: number;          // Positive number
  submittedBy: string;     // Firebase Auth UID
  submittedByName?: string; // Cached name
  approvalStatus: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface Payroll {
  id: string;              // Firestore Document ID
  employeeId: string;      // Firebase Auth UID
  employeeName?: string;   // Cached name
  basicSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  month: number;           // 1-12
  year: number;
  created_at: string;
  updated_at: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = "leave" | "task" | "payroll" | "expense" | "general";

export interface AppNotification {
  id: string;              // Firestore Document ID
  userId: string;          // Target user (Firebase Auth UID)
  title: string;
  message: string;
  type: NotificationType;
  link?: string;           // Optional deep-link (e.g. /dashboard/employee/leave)
  isRead: boolean;
  created_at: string;
}

// ─── Documents / File Upload ─────────────────────────────────────────────────

export interface DocumentFile {
  id: string;              // Firestore Document ID
  name: string;            // Original file name
  fileName: string;        // Name in storage bucket
  storagePath: string;     // Full storage path (files/${uid}/${fileName})
  downloadURL: string;     // Firebase Storage download URL
  mimeType: string;
  size: number;            // Bytes
  uploadedBy: string;      // Firebase Auth UID
  uploadedByName?: string; // Cached name
  relatedModule?: string;  // e.g. "employee", "project", "expense"
  relatedId?: string;      // Related record ID
  created_at: string;
}


