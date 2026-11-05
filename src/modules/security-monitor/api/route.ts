import { NextResponse } from "next/server";

import { createTaskExecutionRecord } from "@/modules/automation/automation";
import { requirePermission } from "@/modules/auth/server";

import { securityMonitorPermissions } from "../permissions";
import { runSecurityTestsTask } from "../automation";
import { getSecurityTestRuns } from "../server";

// GET /api/modules/security-monitor/runs - List test runs
export async function GET(request: Request) {
  try {
    await requirePermission(securityMonitorPermissions, "view");

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1), 100);
    const testSuite = searchParams.get("testSuite") || undefined;
    const status = searchParams.get("status") || undefined;
    const environment = searchParams.get("environment") || undefined;
    const page = Math.max(Number(searchParams.get("page") ?? 1) || 1, 1);

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
      { status: 400 },
    );
  }
}

// POST /api/modules/security-monitor/runs - Queue security tests for the Automation worker.
export async function POST() {
  try {
    const user = await requirePermission(securityMonitorPermissions, "create");
    const requestId = crypto.randomUUID();

    const execution = await createTaskExecutionRecord({
      task: runSecurityTestsTask,
      organizationId: "default",
      requestedById: user.id,
      sourceModule: "security-monitor",
      correlationId: `security-monitor:${requestId}`,
      input: { requestId, testSuite: "security" },
      context: { locale: "tr" },
    });

    return NextResponse.json(
      { executionId: execution.id, status: "queued" },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue security tests" }, // i18n-ignore
      { status: 400 },
    );
  }
}
