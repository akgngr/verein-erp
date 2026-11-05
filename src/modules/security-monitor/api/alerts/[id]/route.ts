import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../../../permissions";
import { resolveSecurityAlert } from "../../../server";

// POST /api/modules/security-monitor/alerts/:id/resolve - Resolve alert
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(securityMonitorPermissions, "update");
    const { id } = await params;
    const userId = user.id;

    const alert = await resolveSecurityAlert(id, userId);

    return NextResponse.json(alert);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to resolve alert" },
      { status: 400 }
    );
  }
}
