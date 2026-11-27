import "server-only";

import { ActionError } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

import { getGobdStatus } from "../queries/gobd";
import { accountBalanceAt } from "./balances";
import {
  AUDIT_ROOM_SECTIONS,
  canAccessAuditRoom,
  canManageAuditRooms,
  canRecordAuditFinding,
  isAuditRoomActive,
  summarizeAuditRoomForPdf,
  type AuditActor,
  type AuditFindingSeverityKey,
  type AuditFindingStatusKey,
  type AuditRoomSectionKey,
} from "./audit-room-core";

export type AuditRoomSummary = {
  id: string;
  year: number;
  title: string;
  auditorUserId: string | null;
  startsAt: string;
  expiresAt: string;
  revokedAt: string | null;
  active: boolean;
  createdByLabel: string;
  checklist: Array<{
    section: AuditRoomSectionKey;
    checked: boolean;
    note: string | null;
    checkedByLabel: string | null;
    checkedAt: string | null;
  }>;
  findings: Array<{
    id: string;
    section: AuditRoomSectionKey;
    severity: AuditFindingSeverityKey;
    status: AuditFindingStatusKey;
    summary: string;
    detail: string | null;
    createdByLabel: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
};

export type AuditGuidedChecklistData = {
  bookingSample: Array<{
    id: string;
    bookingNumber: string;
    bookingDate: string;
    type: string;
    amountCents: number;
    description: string;
    fileCount: number;
  }>;
  receiptCompleteness: {
    missingCount: number;
    sequenceGapCount: number;
    sampleMissing: Array<{ id: string; bookingNumber: string; bookingDate: string; description: string }>;
  };
  cashCounts: Array<{
    accountId: string;
    name: string;
    lastClosing: string | null;
    lastClosingDifferenceCents: number | null;
    balanceCents: number;
    unclosedDays: number;
  }>;
  bankReconciliation: {
    openCount: number;
    bookedCount: number;
    ignoredCount: number;
    accounts: Array<{ id: string; name: string; closingCents: number }>;
  };
  openItems: {
    openInvoicesCount: number;
    openInvoicesCents: number;
    openPayablesCount: number;
    openPayablesCents: number;
  };
};

export type AuditRoomOverviewResult = {
  year: number;
  canManage: boolean;
  hasAccess: boolean;
  expiredOrMissing: boolean;
  rooms: AuditRoomSummary[];
  activeRoom: AuditRoomSummary | null;
  guided: AuditGuidedChecklistData | null;
};

function serializeRoom(
  room: {
    id: string;
    year: number;
    title: string;
    auditorUserId: string | null;
    startsAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    createdByLabel: string;
    checklistItems: Array<{
      section: AuditRoomSectionKey;
      checked: boolean;
      note: string | null;
      checkedByLabel: string | null;
      checkedAt: Date | null;
    }>;
    findings: Array<{
      id: string;
      section: AuditRoomSectionKey;
      severity: AuditFindingSeverityKey;
      status: AuditFindingStatusKey;
      summary: string;
      detail: string | null;
      createdByLabel: string;
      createdAt: Date;
      resolvedAt: Date | null;
    }>;
  },
  now = new Date(),
): AuditRoomSummary {
  const bySection = new Map(room.checklistItems.map((item) => [item.section, item]));
  return {
    id: room.id,
    year: room.year,
    title: room.title,
    auditorUserId: room.auditorUserId,
    startsAt: room.startsAt.toISOString(),
    expiresAt: room.expiresAt.toISOString(),
    revokedAt: room.revokedAt ? room.revokedAt.toISOString() : null,
    active: isAuditRoomActive(room, now),
    createdByLabel: room.createdByLabel,
    checklist: AUDIT_ROOM_SECTIONS.map((section) => {
      const item = bySection.get(section);
      return {
        section,
        checked: item?.checked ?? false,
        note: item?.note ?? null,
        checkedByLabel: item?.checkedByLabel ?? null,
        checkedAt: item?.checkedAt ? item.checkedAt.toISOString() : null,
      };
    }),
    findings: room.findings.map((finding) => ({
      id: finding.id,
      section: finding.section,
      severity: finding.severity,
      status: finding.status,
      summary: finding.summary,
      detail: finding.detail,
      createdByLabel: finding.createdByLabel,
      createdAt: finding.createdAt.toISOString(),
      resolvedAt: finding.resolvedAt ? finding.resolvedAt.toISOString() : null,
    })),
  };
}

export async function getAuditRoomOverview(actor: AuditActor, year: number): Promise<AuditRoomOverviewResult> {
  const db = getDb();
  const now = new Date();
  const canManage = canManageAuditRooms(actor.role);

  const rawRooms = await db.accountingAuditRoom.findMany({
    where: { year },
    orderBy: [{ createdAt: "desc" }],
    include: {
      checklistItems: true,
      findings: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
    },
  });

  const accessibleRooms = rawRooms.filter((room) => canAccessAuditRoom(actor, room, now));
  const activeRaw = accessibleRooms.find((room) => isAuditRoomActive(room, now)) ?? accessibleRooms[0] ?? null;

  await writeAudit({
    userId: actor.id,
    action: "VIEW",
    entity: "AccountingAuditRoom",
    entityId: activeRaw?.id ?? null,
    after: {
      year,
      role: actor.role,
      granted: Boolean(activeRaw) || canManage,
    },
  });

  if (!canManage && accessibleRooms.length === 0) {
    return {
      year,
      canManage: false,
      hasAccess: false,
      expiredOrMissing: true,
      rooms: [],
      activeRoom: null,
      guided: null,
    };
  }

  const end = new Date(Date.UTC(year, 11, 31));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEndExcl = new Date(Date.UTC(year + 1, 0, 1));

  const [sampleBookings, gobd, bankAccounts, bankTxGroups, openInvoices, openPayables] = await Promise.all([
    db.accountingBooking.findMany({
      where: { year, reversedAt: null },
      orderBy: [{ bookingDate: "desc" }, { sequence: "desc" }],
      take: 15,
      select: {
        id: true,
        bookingNumber: true,
        bookingDate: true,
        type: true,
        amount: true,
        description: true,
        _count: { select: { files: { where: { deletedAt: null } } } },
      },
    }),
    getGobdStatus(end),
    db.accountingAccount.findMany({
      where: { type: "BANK", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.accountingBankTransaction.groupBy({
      by: ["status"],
      where: { bookingDate: { gte: yearStart, lt: yearEndExcl } },
      _count: { _all: true },
    }),
    db.accountingInvoice.findMany({
      where: { kind: "INVOICE", status: "ISSUED" },
      select: { grossCents: true, paidCents: true, skontoCents: true },
    }),
    db.accountingPayable.findMany({
      where: { status: { in: ["DRAFT", "OPEN"] } },
      select: { grossCents: true, paidCents: true },
    }),
  ]);

  const bankCounts = new Map(bankTxGroups.map((row) => [row.status, row._count._all]));
  const bankBalances = await Promise.all(
    bankAccounts.map(async (acc) => ({
      id: acc.id,
      name: acc.name,
      closingCents: await accountBalanceAt(acc.id, end),
    })),
  );

  const missingInYear = gobd.checks.missingReceipts.filter((row) => row.bookingDate.getUTCFullYear() === year);
  const gapInYear = gobd.checks.sequenceGaps.find((gap) => gap.year === year);

  const rooms = accessibleRooms.map((room) => serializeRoom(room, now));
  const activeRoom = activeRaw ? serializeRoom(activeRaw, now) : null;

  return {
    year,
    canManage,
    hasAccess: true,
    expiredOrMissing: false,
    rooms,
    activeRoom,
    guided: {
      bookingSample: sampleBookings.map((row) => ({
        id: row.id,
        bookingNumber: row.bookingNumber,
        bookingDate: row.bookingDate.toISOString().slice(0, 10),
        type: row.type,
        amountCents: Math.round(Number(row.amount.toString()) * 100),
        description: row.description,
        fileCount: row._count.files,
      })),
      receiptCompleteness: {
        missingCount: missingInYear.length,
        sequenceGapCount: gapInYear?.missing.length ?? 0,
        sampleMissing: missingInYear.slice(0, 10).map((row) => ({
          id: row.id,
          bookingNumber: row.bookingNumber,
          bookingDate: row.bookingDate.toISOString().slice(0, 10),
          description: row.description,
        })),
      },
      cashCounts: gobd.cash.map((item) => ({
        accountId: item.accountId,
        name: item.name,
        lastClosing: item.lastClosing ? item.lastClosing.toISOString().slice(0, 10) : null,
        lastClosingDifferenceCents: item.lastClosingDifferenceCents,
        balanceCents: item.balanceCents,
        unclosedDays: item.unclosedDays,
      })),
      bankReconciliation: {
        openCount: bankCounts.get("OPEN") ?? 0,
        bookedCount: bankCounts.get("BOOKED") ?? 0,
        ignoredCount: bankCounts.get("IGNORED") ?? 0,
        accounts: bankBalances,
      },
      openItems: {
        openInvoicesCount: openInvoices.length,
        openInvoicesCents: openInvoices.reduce((sum, inv) => sum + Math.max(0, inv.grossCents - inv.paidCents - inv.skontoCents), 0),
        openPayablesCount: openPayables.length,
        openPayablesCents: openPayables.reduce((sum, pay) => sum + Math.max(0, pay.grossCents - pay.paidCents), 0),
      },
    },
  };
}

export async function createAuditRoom(input: {
  year: number;
  title: string;
  auditorUserId: string | null;
  startsAt: Date;
  expiresAt: Date;
  actorId: string;
  actorLabel: string;
}) {
  if (input.expiresAt.getTime() <= input.startsAt.getTime()) {
    throw new ActionError("accounting.auditRoom.errors.invalidWindow");
  }
  const db = getDb();
  return db.accountingAuditRoom.create({
    data: {
      year: input.year,
      title: input.title,
      auditorUserId: input.auditorUserId,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
      createdById: input.actorId,
      createdByLabel: input.actorLabel,
    },
    select: { id: true },
  });
}

export async function revokeAuditRoom(roomId: string) {
  const db = getDb();
  const room = await db.accountingAuditRoom.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) throw new ActionError("accounting.auditRoom.errors.notFound");
  await db.accountingAuditRoom.update({
    where: { id: roomId },
    data: { revokedAt: new Date() },
  });
}

export async function saveAuditChecklistItem(
  actor: AuditActor & { label: string },
  input: { roomId: string; section: AuditRoomSectionKey; checked: boolean; note: string | null },
) {
  const db = getDb();
  const room = await db.accountingAuditRoom.findUnique({ where: { id: input.roomId } });
  if (!room) throw new ActionError("accounting.auditRoom.errors.notFound");
  if (!canRecordAuditFinding(actor, room)) {
    throw new ActionError("accounting.auditRoom.errors.expiredOrDenied");
  }
  await db.accountingAuditChecklistItem.upsert({
    where: { roomId_section: { roomId: input.roomId, section: input.section } },
    create: {
      roomId: input.roomId,
      section: input.section,
      checked: input.checked,
      note: input.note,
      checkedById: input.checked ? actor.id : null,
      checkedByLabel: input.checked ? actor.label : null,
      checkedAt: input.checked ? new Date() : null,
    },
    update: {
      checked: input.checked,
      note: input.note,
      checkedById: input.checked ? actor.id : null,
      checkedByLabel: input.checked ? actor.label : null,
      checkedAt: input.checked ? new Date() : null,
    },
  });
}

export async function addAuditFinding(
  actor: AuditActor & { label: string },
  input: { roomId: string; section: AuditRoomSectionKey; severity: AuditFindingSeverityKey; summary: string; detail: string | null },
) {
  const db = getDb();
  const room = await db.accountingAuditRoom.findUnique({ where: { id: input.roomId } });
  if (!room) throw new ActionError("accounting.auditRoom.errors.notFound");
  if (!canRecordAuditFinding(actor, room)) {
    throw new ActionError("accounting.auditRoom.errors.expiredOrDenied");
  }
  return db.accountingAuditFinding.create({
    data: {
      roomId: input.roomId,
      section: input.section,
      severity: input.severity,
      summary: input.summary,
      detail: input.detail,
      createdById: actor.id,
      createdByLabel: actor.label,
    },
    select: { id: true },
  });
}

export async function resolveAuditFinding(actor: AuditActor, findingId: string) {
  const db = getDb();
  const finding = await db.accountingAuditFinding.findUnique({
    where: { id: findingId },
    include: { room: true },
  });
  if (!finding) throw new ActionError("accounting.auditRoom.errors.notFound");
  if (!canRecordAuditFinding(actor, finding.room)) {
    throw new ActionError("accounting.auditRoom.errors.expiredOrDenied");
  }
  await db.accountingAuditFinding.update({
    where: { id: findingId },
    data: { status: "RESOLVED", resolvedById: actor.id, resolvedAt: new Date() },
  });
}

export async function loadAuditRoomPdfData(actor: AuditActor, year: number) {
  const db = getDb();
  const now = new Date();
  const rooms = await db.accountingAuditRoom.findMany({
    where: { year },
    orderBy: [{ createdAt: "desc" }],
    include: { checklistItems: true, findings: { orderBy: { createdAt: "asc" } } },
  });
  const accessible = rooms.filter((room) => canAccessAuditRoom(actor, room, now));
  if (!canManageAuditRooms(actor.role) && accessible.length === 0) {
    return { allowed: false as const, summary: null };
  }
  const latest = accessible[0] ?? null;
  if (!latest) return { allowed: true as const, summary: null };
  return {
    allowed: true as const,
    summary: summarizeAuditRoomForPdf(latest.checklistItems, latest.findings),
  };
}
