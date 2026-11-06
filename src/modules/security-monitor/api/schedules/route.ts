import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../../permissions";
import {
  getSecurityTestSchedules,
  createSecurityTestSchedule,
} from "../../server";

// GET /api/security-monitor/schedules - List schedules
export async function GET() {
  try {
    await requirePermission(securityMonitorPermissions, "view");

    const schedules = await getSecurityTestSchedules();

    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch schedules" }, // i18n-ignore
      { status: 400 }
    );
  }
}

// POST /api/security-monitor/schedules - Create schedule
export async function POST(request: Request) {
  try {
    await requirePermission(securityMonitorPermissions, "create");

    const body = await request.json();
    
    const schedule = await createSecurityTestSchedule({
      name: body.name,
      testSuite: body.testSuite,
      cronExpression: body.cronExpression,
      enabled: body.enabled,
      timeoutMs: body.timeoutMs,
      retryCount: body.retryCount,
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create schedule" }, // i18n-ignore
      { status: 400 }
    );
  }
}
