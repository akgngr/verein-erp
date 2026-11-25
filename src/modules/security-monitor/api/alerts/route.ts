import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/modules/auth/server";

import { securityMonitorPermissions } from "../../permissions";
import { getSecurityTestAlerts } from "../../server";
import { securityRoute } from "../../services/http";

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["open", "acknowledged", "resolved"]).optional(),
});

// GET /api/security-monitor/alerts - List alerts
export async function GET(request: Request) {
  return securityRoute(async () => {
    await requirePermission(securityMonitorPermissions, "view");
    const query = listQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json(await getSecurityTestAlerts(query));
  });
}
