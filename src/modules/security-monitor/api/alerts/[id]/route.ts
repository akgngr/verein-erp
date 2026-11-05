import { NextResponse } from "next/server";
import { requirePermission } from "@/modules/auth/server";
import { resolveSecurityAlert } from "../../../server";

// POST /api/modules/security-monitor/alerts/:id/resolve - Resolve alert
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("security-monitor", "write");

    const { id } = await params;
    const user = await requirePermission("security-monitor", "write");
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
