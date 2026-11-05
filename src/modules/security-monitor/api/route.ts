import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../permissions";
import { getSecurityTestRuns } from "../server";
import { runSecurityTests } from "../services/test-runner";

// GET /api/modules/security-monitor/runs - List test runs
export async function GET(request: Request) {
  try {
    await requirePermission(securityMonitorPermissions, "view");

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const testSuite = searchParams.get("testSuite") || undefined;
    const status = searchParams.get("status") || undefined;
    const environment = searchParams.get("environment") || undefined;
    const page = parseInt(searchParams.get("page") || "1");

    const result = await getSecurityTestRuns({
      limit,
      testSuite,
      status,
      environment,
      page,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch test runs" }, // i18n-ignore
      { status: 400 }
    );
  }
}

// POST /api/modules/security-monitor/runs - Run tests
export async function POST(request: Request) {
  try {
    const user = await requirePermission(securityMonitorPermissions, "create");

    const body = await request.json();
    const { testSuite = "security" } = body;

    const result = await runSecurityTests({
      testSuite,
      triggeredBy: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run tests" }, // i18n-ignore
      { status: 400 }
    );
  }
}
