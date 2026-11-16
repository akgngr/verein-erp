import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/modules/auth/server";
import { securityMonitorPermissions } from "../../../permissions";
import { acknowledgeSecurityAlert, resolveSecurityAlert } from "../../../server";

const bodySchema = z.object({ action: z.enum(["acknowledge", "resolve"]).default("resolve") }).strict();

// POST /api/security-monitor/alerts/:id — { action: "acknowledge" | "resolve" } (varsayılan: resolve)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(securityMonitorPermissions, "update");
    const { id } = await params;
    const raw = await request.text();
    const parsed = bodySchema.safeParse(raw.trim() ? JSON.parse(raw) : {});
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 }); // i18n-ignore

    const alert = parsed.data.action === "acknowledge" ? await acknowledgeSecurityAlert(id, user.id) : await resolveSecurityAlert(id, user.id);

    return NextResponse.json(alert);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update alert" }, // i18n-ignore
      { status: 400 }
    );
  }
}
