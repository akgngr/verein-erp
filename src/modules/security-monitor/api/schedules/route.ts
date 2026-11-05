import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import {
  getSecurityTestSchedules,
  createSecurityTestSchedule,
  updateSecurityTestSchedule,
  deleteSecurityTestSchedule,
} from "../../server";

// GET /api/modules/security-monitor/schedules - List schedules
export async function GET(request: Request) {
  try {
    await requirePermission("security-monitor", "read");

    const schedules = await getSecurityTestSchedules();

    return NextResponse.json(schedules);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch schedules" },
      { status: 400 }
    );
  }
}

// POST /api/modules/security-monitor/schedules - Create schedule
export async function POST(request: Request) {
  try {
    await requirePermission("security-monitor", "write");

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create schedule" },
      { status: 400 }
    );
  }
}
