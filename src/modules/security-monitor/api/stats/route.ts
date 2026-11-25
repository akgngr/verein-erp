import { NextResponse } from "next/server";

import { requirePermission } from "@/modules/auth/server";

import { securityMonitorPermissions } from "../../permissions";
import { securityRoute } from "../../services/http";
import { getTestStatistics } from "../../services/test-runner";

// GET /api/security-monitor/stats - Get test statistics
export async function GET() {
  return securityRoute(async () => {
    await requirePermission(securityMonitorPermissions, "view");
    return NextResponse.json(await getTestStatistics());
  });
}
