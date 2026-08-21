"use client";

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
export default function ChartsSection() {
  const { stats } = useDashboardStats();

  const emptyData = {
    attendanceTrend: [],
    salesTrend: [],
    expenseByCategory: [],
    projectStatus: [],
  };

  const s = stats ?? emptyData;

  const attendanceColors = ["#3b82f6", "#ef4444"];
  const salesColors = ["#10b981", "#f59e0b"];
  const expenseColors = ["#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
  const projectColors = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6"];

  return (
    <div className="grid gap-6">
      {/* Attendance Trend */}
      <div>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={s.attendanceTrend}>
            <XAxis dataKey="month" stroke={ "#9ca3af" } />
            <YAxis />
            <Tooltip />
            <Legend />
            <CartesianGrid strokeDasharray="3 3" />
            <Line type="monotone" dataKey="present" stroke={attendanceColors[0]} strokeWidth={2} />
            <Line type="monotone" dataKey="late" stroke={attendanceColors[1]} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sales Trend */}
      <div>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Sales Trend (Monthly)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={s.salesTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke={ "#9ca3af" } />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill={salesColors[0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Breakdown */}
      <div>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Expense Breakdown by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart data={s.expenseByCategory}>
            <Pie dataKey="amount">
              {s.expenseByCategory.map((entry, index) => (
                <Cell key={index} fill={expenseColors[index % expenseColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="top" height={140} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Project Status Distribution */}
      <div>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Project Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart data={s.projectStatus}>
            <Pie dataKey="count">
              {s.projectStatus.map((entry, index) => (
                <Cell key={index} fill={projectColors[index % projectColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="top" height={140} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}