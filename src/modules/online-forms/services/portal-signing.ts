import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

export type PortalPendingFormRow = {
  id: string;
  kind: string;
  expiresAt: Date;
  createdAt: Date;
};

export async function listPendingOnlineFormsForPortal(
  memberId: string,
): Promise<PortalPendingFormRow[]> {
  const db = getDb();
  const rows = await db.onlineFormRequest.findMany({
    where: {
      subjectId: memberId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      kind: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  return rows;
}

export async function signOnlineFormForPortal(input: {
  memberId: string;
  subjectRef: string;
  requestId: string;
  signerName: string;
}): Promise<boolean> {
  const trimmedName = input.signerName.trim();
  if (!trimmedName || trimmedName.length > 150) return false;

  const db = getDb();
  const req = await db.onlineFormRequest.findFirst({
    where: {
      id: input.requestId,
      subjectId: input.memberId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: { id: true, kind: true },
  });
  if (!req) return false;

  await db.onlineFormRequest.update({
    where: { id: req.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      signerName: trimmedName,
    },
  });

  await writeAudit({
    userId: input.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_FORM_SIGNED",
    entity: "OnlineFormRequest",
    entityId: req.id,
    after: { memberId: input.memberId, kind: req.kind },
  });

  return true;
}
