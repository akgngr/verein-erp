import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { buildUserLabel } from "@/shared/utils";

import { securityMonitorPermissions } from "../../../permissions";
import { acknowledgeSecurityAlert, resolveSecurityAlert } from "../../../server";
import { NotFoundError, securityRoute } from "../../../services/http";

const bodySchema = z.object({ action: z.enum(["acknowledge", "resolve"]).default("resolve") }).strict();
const idSchema = z.string().min(1).max(64);

// POST /api/security-monitor/alerts/:id — { action: "acknowledge" | "resolve" } (varsayılan: resolve)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return securityRoute(async () => {
    const user = await requirePermission(securityMonitorPermissions, "update");
    const id = idSchema.parse((await params).id);
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const { action } = bodySchema.parse(raw.trim() ? JSON.parse(raw) : {});
    const alert = await (action === "acknowledge" ? acknowledgeSecurityAlert(id, user.id) : resolveSecurityAlert(id, user.id)).catch((error: unknown) => {
      // Prisma P2025: kayıt yok.
      if (error && typeof error === "object" && "code" in error && error.code === "P2025") throw new NotFoundError();
      throw error;
    });
    await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "STATUS_CHANGE", entity: "SecurityTestAlert", entityId: id, after: { status: action === "acknowledge" ? "acknowledged" : "resolved" } });
    return NextResponse.json(alert);
  });
}
