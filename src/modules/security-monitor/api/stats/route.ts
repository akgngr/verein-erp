import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../../permissions";
import { getTestStatistics } from "../../services/test-runner";

// GET /api/modules/security-monitor/stats - Get test statistics
export async function GET(request: Request) {
  try {
    await requirePermission(securityMonitorPermissions, "view");

    const statistics = await getTestStatistics();

    return NextResponse.json(statistics);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch statistics" },, // i18n-ignore
      { status: 400 }
    );
  }
}
