import { NextResponse } from "next/server";
import { z } from "zod";

import { createTaskExecutionRecord } from "@/modules/automation/automation";
import { requirePermission } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { buildUserLabel } from "@/shared/utils";

import { runSecurityTestsTask } from "../../automation";
import { securityMonitorPermissions } from "../../permissions";
import { getSecurityTestRuns } from "../../server";
import { securityRoute } from "../../services/http";

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  testSuite: z.enum(["security"]).optional(),
  status: z.enum(["passed", "failed", "error"]).optional(),
  environment: z.enum(["development", "test", "production"]).optional(),
});

// GET /api/security-monitor/runs - List test runs
export async function GET(request: Request) {
  return securityRoute(async () => {
    await requirePermission(securityMonitorPermissions, "view");
    const query = listQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    return NextResponse.json(await getSecurityTestRuns(query));
  });
}

// POST /api/security-monitor/runs - Queue the runtime security checks for the Automation worker.
export async function POST() {
  return securityRoute(async () => {
    const user = await requirePermission(securityMonitorPermissions, "create");
    const requestId = crypto.randomUUID();
    const execution = await createTaskExecutionRecord({
      task: runSecurityTestsTask,
      organizationId: "default",
      requestedById: user.id,
      sourceModule: "security-monitor",
      correlationId: `security-monitor:${requestId}`,
      input: { requestId, testSuite: "security" },
      context: { locale: process.env.DOCUMENT_LANGUAGE === "tr" ? "tr" : "de" },
    });
    await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "CREATE", entity: "SecurityTestRun", entityId: execution.id, after: { testSuite: "security" } });
    return NextResponse.json({ executionId: execution.id, status: "queued" }, { status: 202 });
  });
}
