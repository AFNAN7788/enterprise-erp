import { NextResponse } from "next/server";
import { getDashboardStatsAction } from "@/app/actions/dashboardStats";

const TIMEOUT_MS = 30000;

export async function GET() {
  try {
    const result = await Promise.race([
      getDashboardStatsAction().then((r) => ({ ...r, timedOut: false as const })),
      new Promise<{ stats: null; role: string; error: string; timedOut: true }>((resolve) =>
        setTimeout(
          () => resolve({ stats: null, role: "", error: "Dashboard stats timed out", timedOut: true }),
          TIMEOUT_MS
        )
      ),
    ]);

    if (result.timedOut) {
      return NextResponse.json(
        { stats: null, role: "", error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API route error fetching dashboard stats:", error);
    return NextResponse.json(
      { stats: null, role: "", error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
