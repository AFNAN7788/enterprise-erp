import { onSchedule } from "firebase-functions/v2/scheduler";
import { computeCompanyStats, computeTeamStats, computeUserStats } from "@/lib/dashboardStats";

export const refreshDashboardStats = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "UTC",
    retryConfig: {
      maxRetries: 2,
      maxBackoffSeconds: 60,
    },
  },
  async (event) => {
    console.log("Refreshing dashboard stats at", event.scheduleTime);

    try {
      await computeCompanyStats();
      console.log("Company stats refreshed");

      const { getFirestore, getDocs, collection, query, where } = await import("firebase-admin/firestore");
      const db = getFirestore();

      const managersSnap = await getDocs(query(collection(db, "profiles"), where("role", "==", "manager")));
      await Promise.all(managersSnap.docs.map((doc) => computeTeamStats(doc.id)));
      console.log(`Team stats refreshed for ${managersSnap.size} managers`);

      const employeesSnap = await getDocs(query(collection(db, "profiles"), where("role", "==", "employee")));
      await Promise.all(employeesSnap.docs.map((doc) => computeUserStats(doc.id)));
      console.log(`User stats refreshed for ${employeesSnap.size} employees`);

      console.log("Dashboard stats refresh completed successfully");
    } catch (error) {
      console.error("Error refreshing dashboard stats:", error);
      throw error;
    }
  }
);
