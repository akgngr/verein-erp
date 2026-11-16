import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../../permissions";
import { getSecurityTestAlerts } from "../../server";

// GET /api/security-monitor/alerts - List alerts
export async function GET(request: Request) {
  try {
    await requirePermission(securityMonitorPermissions, "view");

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");

    const result = await getSecurityTestAlerts({
      limit,
      severity,
      status,
      page,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch alerts" }, // i18n-ignore
      { status: 400 }
    );
  }
}
