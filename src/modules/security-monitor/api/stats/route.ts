import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { getTestStatistics } from "../../services/test-runner";

// GET /api/modules/security-monitor/stats - Get test statistics
export async function GET(request: Request) {
  try {
    await requirePermission("security-monitor", "read");

    const statistics = await getTestStatistics();

    return NextResponse.json(statistics);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch statistics" },
      { status: 400 }
    );
  }
}
