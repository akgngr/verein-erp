import "server-only";

import { getDb } from "@/shared/db";

export type PortalSubjectAuditEntry = {
  id: string;
  actorRole: "PORTAL" | "BOARD" | "SYSTEM";
  category: string;
  action: string;
  createdAt: Date;
};

function mapActorRole(userId: string | null, action: string): "PORTAL" | "BOARD" | "SYSTEM" {
  if (userId?.startsWith("member:") || action.startsWith("PORTAL_")) return "PORTAL";
  if (userId) return "BOARD";
  return "SYSTEM";
}

function mapCategory(entity: string): string {
  switch (entity) {
    case "Member":
    case "MemberCorrectionProposal":
      return "masterData";
    case "MemberPayment":
    case "ZuwendungConfirmation":
      return "receipts";
    case "EventAttendee":
      return "events";
    case "OnlineFormRequest":
      return "signing";
    case "PortalArt15Request":
      return "art15";
    default:
      return "portal";
  }
}

/**
 * Subject processing log for Member Portal (ADR 0010 P3):
 * returns ONLY this subject's entries with role category, time, and category —
 * NEVER any other person's name (userLabel is omitted).
 *
 * #583: Yönetimin kaydettiği ödeme/makbuz işlemleri (MemberPayment CREATE/VOID) kaydın kimliğiyle değil,
 * denetimdeki üye numarasıyla (`after.memberNumber`) eşleşir; önceden bu kişiye ait olsalar da listede yoktu.
 */
export async function listSubjectAuditLogsForPortal(input: {
  subjectRef: string;
  memberId: string;
  memberNumber?: string | null;
}): Promise<PortalSubjectAuditEntry[]> {
  const db = getDb();
  const rows = await db.auditLog.findMany({
    where: {
      OR: [
        { userId: input.subjectRef },
        { entity: "Member", entityId: input.memberId },
        { entity: "OnlineFormRequest", entityId: input.memberId },
        ...(input.memberNumber
          ? [{ entity: "MemberPayment", changes: { path: ["after", "memberNumber"], equals: input.memberNumber } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      userId: true,
      action: true,
      entity: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    actorRole: mapActorRole(row.userId, row.action),
    category: mapCategory(row.entity),
    action: row.action,
    createdAt: row.createdAt,
  }));
}
