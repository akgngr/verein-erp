import "server-only";

import type { GrantStatus } from "@prisma/client";

import { listProjectBookings, type ProjectBookingRow } from "@/modules/accounting/server";
import { getDb } from "@/shared/db";

export type Actor = { id: string; label: string };
export const STATUSES = ["PLANNED", "APPLIED", "APPROVED", "ACTIVE", "REPORTED", "CLOSED", "REJECTED"] as const;
/** Bu oranı aşan kalem sapmaları raporda işaretlenir (çoğu ANBest-P: %20). */
export const DEVIATION_LIMIT = 0.2;

const day = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : null);
const toDate = (value: string) => new Date(`${value}T00:00:00Z`);

export type GrantInput = {
  name: string; funder: string; fileNumber: string | null; purpose: string | null; status: GrantStatus;
  approvedCents: number | null; ownShareCents: number; thirdPartyCents: number;
  periodStart: string; periodEnd: string; reportDueAt: string | null; projectId: string | null; useNetAmounts: boolean;
};

export async function listGrants() {
  const rows = await getDb().grant.findMany({ orderBy: [{ periodEnd: "desc" }], include: { payouts: { select: { amountCents: true, receivedAt: true } } }, take: 500 });
  return rows.map((row) => ({
    id: row.id, name: row.name, funder: row.funder, fileNumber: row.fileNumber, status: row.status,
    approvedCents: row.approvedCents, periodStart: day(row.periodStart)!, periodEnd: day(row.periodEnd)!, reportDueAt: day(row.reportDueAt),
    receivedCents: row.payouts.filter((item) => item.receivedAt).reduce((sum, item) => sum + item.amountCents, 0),
    reportSubmittedAt: row.reportSubmittedAt?.toISOString() ?? null,
  }));
}

export async function getGrant(id: string) {
  const row = await getDb().grant.findUnique({ where: { id }, include: { lines: { orderBy: { sortOrder: "asc" } }, payouts: { orderBy: { requestedAt: "asc" } } } });
  if (!row) return null;
  return {
    id: row.id, name: row.name, funder: row.funder, fileNumber: row.fileNumber, purpose: row.purpose, status: row.status,
    approvedCents: row.approvedCents, ownShareCents: row.ownShareCents, thirdPartyCents: row.thirdPartyCents,
    periodStart: day(row.periodStart)!, periodEnd: day(row.periodEnd)!, reportDueAt: day(row.reportDueAt), projectId: row.projectId,
    useNetAmounts: row.useNetAmounts, reportText: row.reportText ?? "", reportSubmittedAt: row.reportSubmittedAt?.toISOString() ?? null,
    lines: row.lines.map((line) => ({ id: line.id, label: line.label, plannedCents: line.plannedCents, categoryIds: line.categoryIds })),
    payouts: row.payouts.map((item) => ({ id: item.id, requestedAt: day(item.requestedAt)!, amountCents: item.amountCents, receivedAt: day(item.receivedAt), note: item.note })),
  };
}
export type GrantDetail = NonNullable<Awaited<ReturnType<typeof getGrant>>>;

export async function saveGrant(id: string | null, input: GrantInput, actor: Actor) {
  const data = { ...input, periodStart: toDate(input.periodStart), periodEnd: toDate(input.periodEnd), reportDueAt: input.reportDueAt ? toDate(input.reportDueAt) : null };
  if (id) return getDb().grant.update({ where: { id }, data, select: { id: true } });
  return getDb().grant.create({ data: { ...data, createdById: actor.id, createdByLabel: actor.label }, select: { id: true } });
}

export async function deleteGrant(id: string) {
  await getDb().grant.delete({ where: { id } });
}

/** Finansman planı kalemlerini toptan değiştirir. */
export async function saveLines(grantId: string, lines: { label: string; plannedCents: number; categoryIds: string[] }[]) {
  const db = getDb();
  await db.$transaction([
    db.grantBudgetLine.deleteMany({ where: { grantId } }),
    db.grantBudgetLine.createMany({ data: lines.map((line, index) => ({ grantId, label: line.label, plannedCents: line.plannedCents, categoryIds: [...new Set(line.categoryIds)], sortOrder: index })) }),
  ]);
}

export async function addPayout(grantId: string, input: { requestedAt: string; amountCents: number; receivedAt: string | null; note: string | null }) {
  await getDb().grantPayout.create({ data: { grantId, requestedAt: toDate(input.requestedAt), amountCents: input.amountCents, receivedAt: input.receivedAt ? toDate(input.receivedAt) : null, note: input.note } });
}
export async function setPayoutReceived(id: string, receivedAt: string | null) {
  await getDb().grantPayout.update({ where: { id }, data: { receivedAt: receivedAt ? toDate(receivedAt) : null } });
}
export async function deletePayout(id: string) {
  await getDb().grantPayout.delete({ where: { id } });
}

export async function saveReportText(id: string, text: string, submitted: boolean | null) {
  await getDb().grant.update({ where: { id }, data: { reportText: text, ...(submitted === null ? {} : { reportSubmittedAt: submitted ? new Date() : null, ...(submitted ? { status: "REPORTED" as const } : {}) }) } });
}

export type ReportLine = { id: string | null; label: string; plannedCents: number; actualCents: number; diffCents: number; diffRatio: number | null; flagged: boolean };
export type GrantReport = {
  lines: ReportLine[];
  totals: { plannedCents: number; actualCents: number };
  financing: { approvedCents: number; receivedCents: number; ownShareCents: number; thirdPartyCents: number; otherIncomeCents: number; neededGrantCents: number; overpaidCents: number };
  vouchers: (ProjectBookingRow & { counted: number; lineLabel: string })[];
  incomes: (ProjectBookingRow & { counted: number })[];
  missingReceipts: number;
  linked: boolean;
};

/**
 * Zahlenmäßiger Nachweis: projenin dönem fişleri kalemlere kategoriyle dağıtılır (eşlenmeyen → "Diğer"),
 * plan/gerçekleşen ve sapma hesaplanır. Gereken hibe = harcama − öz katkı − üçüncü taraf − diğer gelir.
 */
export async function buildReport(grant: GrantDetail, otherLabel: string): Promise<GrantReport> {
  const bookings = grant.projectId ? await listProjectBookings(grant.projectId, toDate(grant.periodStart), toDate(grant.periodEnd)) : [];
  const counted = (row: ProjectBookingRow) => (grant.useNetAmounts ? row.netCents : row.amountCents);
  const byCategory = new Map<string, string>();
  for (const line of grant.lines) for (const categoryId of line.categoryIds) if (!byCategory.has(categoryId)) byCategory.set(categoryId, line.id);
  const actual = new Map<string | null, number>();
  const vouchers: GrantReport["vouchers"] = [];
  for (const row of bookings.filter((item) => item.type === "EXPENSE")) {
    const lineId = (row.categoryId && byCategory.get(row.categoryId)) ?? null;
    actual.set(lineId, (actual.get(lineId) ?? 0) + counted(row));
    vouchers.push({ ...row, counted: counted(row), lineLabel: grant.lines.find((line) => line.id === lineId)?.label ?? otherLabel });
  }
  const lines: ReportLine[] = grant.lines.map((line) => {
    const value = actual.get(line.id) ?? 0;
    const diffRatio = line.plannedCents ? (value - line.plannedCents) / line.plannedCents : null;
    return { id: line.id, label: line.label, plannedCents: line.plannedCents, actualCents: value, diffCents: value - line.plannedCents, diffRatio, flagged: diffRatio !== null && Math.abs(diffRatio) > DEVIATION_LIMIT };
  });
  const other = actual.get(null) ?? 0;
  if (other) lines.push({ id: null, label: otherLabel, plannedCents: 0, actualCents: other, diffCents: other, diffRatio: null, flagged: true });
  const incomes = bookings.filter((item) => item.type === "INCOME").map((row) => ({ ...row, counted: counted(row) }));
  const receivedCents = grant.payouts.filter((item) => item.receivedAt).reduce((sum, item) => sum + item.amountCents, 0);
  const actualTotal = lines.reduce((sum, line) => sum + line.actualCents, 0);
  // Projeye bağlı gelirler içinde hibe ödemeleri de olabilir; "diğer gelir" = toplam gelir − alınan hibe (negatif olamaz).
  const otherIncomeCents = Math.max(0, incomes.reduce((sum, row) => sum + row.counted, 0) - receivedCents);
  const neededGrantCents = Math.max(0, actualTotal - grant.ownShareCents - grant.thirdPartyCents - otherIncomeCents);
  return {
    lines,
    totals: { plannedCents: grant.lines.reduce((sum, line) => sum + line.plannedCents, 0), actualCents: actualTotal },
    financing: { approvedCents: grant.approvedCents ?? 0, receivedCents, ownShareCents: grant.ownShareCents, thirdPartyCents: grant.thirdPartyCents, otherIncomeCents, neededGrantCents, overpaidCents: Math.max(0, receivedCents - Math.min(neededGrantCents, grant.approvedCents ?? neededGrantCents)) },
    vouchers,
    incomes,
    missingReceipts: vouchers.filter((row) => row.fileCount === 0).length,
    linked: Boolean(grant.projectId),
  };
}

/** Panel/AI: kişi verisi olmayan toplu sayılar. */
export async function grantStats() {
  const rows = await getDb().grant.findMany({ select: { status: true, approvedCents: true, reportDueAt: true, reportSubmittedAt: true } });
  const now = new Date();
  return {
    byStatus: Object.fromEntries(STATUSES.map((status) => [status, rows.filter((row) => row.status === status).length])),
    approvedTotal: rows.reduce((sum, row) => sum + (row.approvedCents ?? 0), 0) / 100,
    reportsOverdue: rows.filter((row) => row.reportDueAt && !row.reportSubmittedAt && row.reportDueAt < now).length,
    reportsDueIn30Days: rows.filter((row) => row.reportDueAt && !row.reportSubmittedAt && row.reportDueAt >= now && row.reportDueAt.getTime() - now.getTime() < 30 * 86_400_000).length,
  };
}
