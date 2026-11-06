import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../../../permissions";
import { updateSecurityTestSchedule, deleteSecurityTestSchedule } from "../../../server";

// PUT /api/security-monitor/schedules/:id - Update schedule
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(securityMonitorPermissions, "update");

    const { id } = await params;
    const body = await request.json();

    const schedule = await updateSecurityTestSchedule(id, {
      name: body.name,
      testSuite: body.testSuite,
      cronExpression: body.cronExpression,
      enabled: body.enabled,
      timeoutMs: body.timeoutMs,
      retryCount: body.retryCount,
    });

    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update schedule" }, // i18n-ignore
      { status: 400 }
    );
  }
}

// DELETE /api/security-monitor/schedules/:id - Delete schedule
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(securityMonitorPermissions, "delete");

    const { id } = await params;

    await deleteSecurityTestSchedule(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete schedule" }, // i18n-ignore
      { status: 400 }
    );
  }
}
