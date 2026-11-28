import "server-only";

import type { CrmActivityKind, CrmDealStage, CrmStage } from "@prisma/client";

import { accountingPermissions, getContactSummaries, searchContacts } from "@/modules/accounting/server";
import { getMemberContacts, membersPermissions, searchMemberContacts } from "@/modules/members/automation";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";
import { can, type PermissionDefinition } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { crmDealStageChangedEvent } from "../automation";
import { summarizeParty, type PartySummary } from "../lib/party-summary";

/**
 * CRM: kişi kaydı kaynak modüllerde (üyeler, muhasebe carisi) kalır; burada yalnız ilişki
 * bilgisi (aşama, sorumlu, etiket), fırsatlar, zaman akışı ve takipler tutulur.
 */
export const SOURCES = ["members", "accounting"] as const;
export type CrmSource = (typeof SOURCES)[number];
export type Actor = { id: string; label: string };

export type { PartySummary };

/**
 * Kişi bilgisini kimin gördüğü (#582): CRM yalnız ilişki verisini tutar; ad ve iletişim kaynak modülün
 * `view` iznine tabidir. Örn. VIEWER/SECRETARY muhasebe carisini göremez, CRM'de de göremez.
 * `restrictedLabel` izin yoksa ad yerine gösterilen çevrilmiş metindir.
 */
export type PartyViewer = { role: Role; restrictedLabel: string };

const SOURCE_PERMISSIONS: Record<CrmSource, PermissionDefinition> = {
  members: membersPermissions,
  accounting: accountingPermissions,
};

export function canReadSource(role: Role, source: string): boolean {
  const definition = SOURCE_PERMISSIONS[source as CrmSource];
  return Boolean(definition) && can(role, definition, "view");
}

/** Kaynak modül açık VE rol kişi verisini görebiliyorsa okunur. */
async function readableSources(role: Role): Promise<{ usable: Set<string>; readable: Set<CrmSource> }> {
  const usable = new Set(await listUsableModuleKeys());
  return { usable, readable: new Set(SOURCES.filter((source) => usable.has(source) && canReadSource(role, source))) };
}

/**
 * Kaynak modüllerden ad/iletişim (toplu). Modül kapalıysa veya kayıt silinmişse "missing"; rolün kaynak
 * modülde görme izni yoksa "restricted" (kaynak hiç sorgulanmaz).
 */
export async function resolveParties(
  rows: { sourceModule: string; sourceId: string }[],
  viewer: PartyViewer,
): Promise<Map<string, PartySummary>> {
  const { usable, readable } = await readableSources(viewer.role);
  const ids = (module: string) => rows.filter((row) => row.sourceModule === module).map((row) => row.sourceId);
  const [members, contacts] = await Promise.all([
    readable.has("members") ? getMemberContacts(ids("members")) : Promise.resolve(new Map()),
    readable.has("accounting") ? getContactSummaries(ids("accounting")) : Promise.resolve(new Map()),
  ]);
  const out = new Map<string, PartySummary>();
  const context = { usable, readable: readable as ReadonlySet<string>, members, contacts, restrictedLabel: viewer.restrictedLabel };
  for (const row of rows) out.set(`${row.sourceModule}:${row.sourceId}`, summarizeParty(row, context));
  return out;
}

/** Eklemek için kaynaklarda arama (yalnız rolün görebildiği kaynaklar); zaten CRM'de olanlar işaretlenir. */
export async function searchCandidates(query: string, role: Role) {
  const { readable } = await readableSources(role);
  const [members, contacts] = await Promise.all([
    readable.has("members") ? searchMemberContacts(query, 15) : Promise.resolve([]),
    readable.has("accounting") ? searchContacts(query, 15) : Promise.resolve([]),
  ]);
  const candidates = [
    ...members.map((row) => ({ source: "members" as const, id: row.id, name: `${row.firstName} ${row.lastName}`.trim(), detail: row.membershipNumber })),
    ...contacts.map((row) => ({ source: "accounting" as const, id: row.id, name: row.name, detail: `${row.number}${row.contactPerson ? ` · ${row.contactPerson}` : ""}` })),
  ];
  if (candidates.length === 0) return [];
  const existing = await getDb().crmParty.findMany({
    where: { OR: candidates.map((row) => ({ sourceModule: row.source, sourceId: row.id })) },
    select: { sourceModule: true, sourceId: true, id: true },
  });
  return candidates.map((row) => ({ ...row, partyId: existing.find((item) => item.sourceModule === row.source && item.sourceId === row.id)?.id ?? null }));
}

export async function addParty(source: CrmSource, sourceId: string, actor: Actor, role: Role) {
  const summary = (await resolveParties([{ sourceModule: source, sourceId }], { role, restrictedLabel: "" })).get(`${source}:${sourceId}`);
  if (!summary || summary.missing || summary.restricted) return null;
  return getDb().crmParty.upsert({
    where: { sourceModule_sourceId: { sourceModule: source, sourceId } },
    create: { sourceModule: source, sourceId, createdById: actor.id },
    update: {},
    select: { id: true },
  });
}

export async function listParties(filter: { stage?: CrmStage | null; q?: string }, viewer: PartyViewer) {
  const rows = await getDb().crmParty.findMany({
    where: filter.stage ? { stage: filter.stage } : {},
    include: {
      followUps: { where: { doneAt: null }, orderBy: { dueAt: "asc" }, take: 1, select: { dueAt: true } },
      _count: { select: { deals: { where: { stage: { in: ["OPEN", "PROPOSAL"] } } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  const summaries = await resolveParties(rows, viewer);
  const q = (filter.q ?? "").trim().toLocaleLowerCase("tr");
  return rows
    .map((row) => ({
      id: row.id,
      source: row.sourceModule,
      sourceId: row.sourceId,
      stage: row.stage,
      tags: row.tags,
      ownerId: row.ownerId,
      openDeals: row._count.deals,
      nextFollowUp: row.followUps[0]?.dueAt.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      ...summaries.get(`${row.sourceModule}:${row.sourceId}`)!,
    }))
    .filter((row) => !q || row.name.toLocaleLowerCase("tr").includes(q) || row.tags.some((tag) => tag.toLocaleLowerCase("tr").includes(q)));
}

export async function getPartyDetail(id: string, viewer: PartyViewer) {
  const party = await getDb().crmParty.findUnique({
    where: { id },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 100 },
      followUps: { orderBy: [{ doneAt: "asc" }, { dueAt: "asc" }], take: 50 },
    },
  });
  if (!party) return null;
  const summary = (await resolveParties([party], viewer)).get(`${party.sourceModule}:${party.sourceId}`)!;
  return { party, summary };
}

/**
 * Yazma işlemleri (#582): kayıt yoksa `null` döner (eylem "bulunamadı" der); denetim kaydı için önceki/sonraki
 * değerler döndürülür. Not, özet ve kişi adı denetime yazılmaz.
 */
export async function updateParty(id: string, data: { stage?: CrmStage; ownerId?: string | null; tags?: string[] }) {
  const db = getDb();
  const before = await db.crmParty.findUnique({ where: { id }, select: { stage: true, tags: true, ownerId: true } });
  if (!before) return null;
  const after = await db.crmParty.update({
    where: { id },
    data: { ...data, ...(data.tags ? { tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20) } : {}) },
    select: { stage: true, tags: true, ownerId: true },
  });
  return { before, after };
}

export async function removeParty(id: string) {
  const db = getDb();
  const before = await db.crmParty.findUnique({ where: { id }, select: { sourceModule: true, sourceId: true, stage: true } });
  if (!before) return null;
  await db.crmParty.delete({ where: { id } });
  return before;
}

/** Fırsat verildiyse aynı kişiye ait olmalıdır. */
async function dealBelongsToParty(dealId: string | null | undefined, partyId: string): Promise<boolean> {
  if (!dealId) return true;
  const deal = await getDb().crmDeal.findUnique({ where: { id: dealId }, select: { partyId: true } });
  return deal?.partyId === partyId;
}

async function partyExists(partyId: string): Promise<boolean> {
  return Boolean(await getDb().crmParty.findUnique({ where: { id: partyId }, select: { id: true } }));
}

export async function addActivity(partyId: string, input: { kind: CrmActivityKind; summary: string; occurredAt?: Date; dealId?: string | null }, actor: Actor) {
  if (!(await partyExists(partyId)) || !(await dealBelongsToParty(input.dealId, partyId))) return null;
  const [activity] = await getDb().$transaction([
    getDb().crmActivity.create({ data: { partyId, kind: input.kind, summary: input.summary, occurredAt: input.occurredAt ?? new Date(), dealId: input.dealId ?? null, createdById: actor.id, createdByLabel: actor.label }, select: { id: true } }),
    getDb().crmParty.update({ where: { id: partyId }, data: { updatedAt: new Date() } }),
  ]);
  return activity;
}

const DEAL_AUDIT_SELECT = { id: true, partyId: true, title: true, amountCents: true, stage: true, expectedCloseAt: true } as const;

export async function saveDeal(input: { id?: string; partyId: string; title: string; amountCents: number | null; expectedCloseAt: Date | null; ownerId?: string | null }) {
  const db = getDb();
  const data = { title: input.title, amountCents: input.amountCents, expectedCloseAt: input.expectedCloseAt, ownerId: input.ownerId ?? null };
  if (input.id) {
    const before = await db.crmDeal.findUnique({ where: { id: input.id }, select: DEAL_AUDIT_SELECT });
    if (!before || before.partyId !== input.partyId) return null;
    const after = await db.crmDeal.update({ where: { id: input.id }, data, select: DEAL_AUDIT_SELECT });
    return { id: after.id, before, after };
  }
  if (!(await partyExists(input.partyId))) return null;
  const after = await db.crmDeal.create({ data: { ...data, partyId: input.partyId }, select: DEAL_AUDIT_SELECT });
  return { id: after.id, before: null, after };
}

/** Aşama değişimi: zaman akışına not düşer ve otomasyon olayı yayımlanır. Kayıt yoksa `null`. */
export async function moveDeal(id: string, stage: CrmDealStage, actor: Actor, note: string) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const deal = await tx.crmDeal.findUnique({ where: { id }, select: { stage: true, partyId: true } });
    if (!deal) return null;
    if (deal.stage === stage) return { from: deal.stage, to: stage, changed: false };
    await tx.crmDeal.update({ where: { id }, data: { stage, closedAt: stage === "WON" || stage === "LOST" ? new Date() : null } });
    await tx.crmActivity.create({ data: { partyId: deal.partyId, dealId: id, kind: "OTHER", summary: note, createdById: actor.id, createdByLabel: actor.label } });
    await emitAutomationEvent(crmDealStageChangedEvent, { dealId: id, from: deal.stage, to: stage }, tx);
    return { from: deal.stage, to: stage, changed: true };
  });
}

export async function deleteDeal(id: string) {
  const db = getDb();
  const before = await db.crmDeal.findUnique({ where: { id }, select: DEAL_AUDIT_SELECT });
  if (!before) return null;
  await db.crmDeal.delete({ where: { id } });
  return before;
}

export async function addFollowUp(partyId: string, input: { dueAt: Date; note: string; dealId?: string | null; assigneeId?: string | null }) {
  if (!(await partyExists(partyId)) || !(await dealBelongsToParty(input.dealId, partyId))) return null;
  return getDb().crmFollowUp.create({
    data: { partyId, dueAt: input.dueAt, note: input.note, dealId: input.dealId ?? null, assigneeId: input.assigneeId ?? null },
    select: { id: true, partyId: true, dealId: true, dueAt: true },
  });
}

export async function completeFollowUp(id: string, done: boolean) {
  const result = await getDb().crmFollowUp.updateMany({ where: { id }, data: { doneAt: done ? new Date() : null } });
  return result.count === 1;
}

/** Fırsat panosu: aşamaya göre, kişi adlarıyla. */
export async function listDeals(viewer: PartyViewer) {
  const deals = await getDb().crmDeal.findMany({ include: { party: { select: { id: true, sourceModule: true, sourceId: true } } }, orderBy: { updatedAt: "desc" }, take: 500 });
  const summaries = await resolveParties(deals.map((deal) => deal.party), viewer);
  return deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    amountCents: deal.amountCents,
    stage: deal.stage,
    expectedCloseAt: deal.expectedCloseAt?.toISOString() ?? null,
    partyId: deal.party.id,
    partyName: summaries.get(`${deal.party.sourceModule}:${deal.party.sourceId}`)?.name ?? "—",
  }));
}

/** Açık takipler (bugüne kadar gecikmiş + yaklaşan). */
export async function listOpenFollowUps(viewer: PartyViewer) {
  const rows = await getDb().crmFollowUp.findMany({ where: { doneAt: null }, include: { party: { select: { id: true, sourceModule: true, sourceId: true } } }, orderBy: { dueAt: "asc" }, take: 200 });
  const summaries = await resolveParties(rows.map((row) => row.party), viewer);
  return rows.map((row) => ({ id: row.id, dueAt: row.dueAt.toISOString(), note: row.note, partyId: row.party.id, partyName: summaries.get(`${row.party.sourceModule}:${row.party.sourceId}`)?.name ?? "—" }));
}

export type HubFollowUpItem = {
  id: string;
  assigneeId: string | null;
  partyId: string;
  partyName: string;
  dueAt: string;
  note: string;
};

/** Birleşik görev merkezi (tasks) için açık CRM takipleri (viewer RBAC korunur). */
export async function listOpenFollowUpsForHub(
  viewer: PartyViewer,
  options?: { assigneeId?: string },
): Promise<HubFollowUpItem[]> {
  const rows = await getDb().crmFollowUp.findMany({
    where: {
      doneAt: null,
      ...(options?.assigneeId ? { assigneeId: options.assigneeId } : {}),
    },
    include: { party: { select: { id: true, sourceModule: true, sourceId: true } } },
    orderBy: { dueAt: "asc" },
    take: 200,
  });
  const summaries = await resolveParties(
    rows.map((row) => row.party),
    viewer,
  );
  return rows.map((row) => ({
    id: row.id,
    assigneeId: row.assigneeId,
    partyId: row.party.id,
    partyName: summaries.get(`${row.party.sourceModule}:${row.party.sourceId}`)?.name ?? "—",
    dueAt: row.dueAt.toISOString(),
    note: row.note,
  }));
}

/** Panel ve AI için toplu sayılar (kişi bilgisi yok). */
export async function pipelineStats() {
  const db = getDb();
  const [byStage, parties, overdue] = await Promise.all([
    db.crmDeal.groupBy({ by: ["stage"], _count: { _all: true }, _sum: { amountCents: true } }),
    db.crmParty.groupBy({ by: ["stage"], _count: { _all: true } }),
    db.crmFollowUp.count({ where: { doneAt: null, dueAt: { lt: new Date() } } }),
  ]);
  return {
    deals: Object.fromEntries(byStage.map((row) => [row.stage, { count: row._count._all, amount: (row._sum.amountCents ?? 0) / 100 }])),
    parties: Object.fromEntries(parties.map((row) => [row.stage, row._count._all])),
    overdueFollowUps: overdue,
  };
}

/** AI için: yalnız aşama bazlı fırsat sayısı ve tutarı (K3; başlık, kişi, not yok). */
export {dealStageTotals} from "../queries/ai-stats";
