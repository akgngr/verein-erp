import "server-only";

import type { CrmActivityKind, CrmDealStage, CrmStage } from "@prisma/client";

import { getContactSummaries, searchContacts } from "@/modules/accounting/server";
import { getMemberContacts, searchMemberContacts } from "@/modules/members/automation";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";

import { crmDealStageChangedEvent } from "../automation";

/**
 * CRM: kişi kaydı kaynak modüllerde (üyeler, muhasebe carisi) kalır; burada yalnız ilişki
 * bilgisi (aşama, sorumlu, etiket), fırsatlar, zaman akışı ve takipler tutulur.
 */
export const SOURCES = ["members", "accounting"] as const;
export type CrmSource = (typeof SOURCES)[number];
export type Actor = { id: string; label: string };

export type PartySummary = { name: string; detail: string; email: string | null; phone: string | null; missing: boolean };

/** Kaynak modüllerden ad/iletişim (toplu). Modül kapalıysa veya kayıt silinmişse "missing". */
export async function resolveParties(rows: { sourceModule: string; sourceId: string }[]): Promise<Map<string, PartySummary>> {
  const usable = new Set(await listUsableModuleKeys());
  const ids = (module: string) => rows.filter((row) => row.sourceModule === module).map((row) => row.sourceId);
  const [members, contacts] = await Promise.all([
    usable.has("members") ? getMemberContacts(ids("members")) : Promise.resolve(new Map()),
    usable.has("accounting") ? getContactSummaries(ids("accounting")) : Promise.resolve(new Map()),
  ]);
  const out = new Map<string, PartySummary>();
  for (const row of rows) {
    const key = `${row.sourceModule}:${row.sourceId}`;
    if (row.sourceModule === "members") {
      const member = members.get(row.sourceId);
      out.set(key, member
        ? { name: `${member.firstName} ${member.lastName}`.trim(), detail: "", email: member.email, phone: member.phone, missing: false }
        : { name: "—", detail: "", email: null, phone: null, missing: true });
    } else {
      const contact = contacts.get(row.sourceId);
      out.set(key, contact
        ? { name: contact.name, detail: contact.contactPerson ?? "", email: contact.email, phone: contact.phone, missing: false }
        : { name: "—", detail: "", email: null, phone: null, missing: true });
    }
  }
  return out;
}

/** Eklemek için kaynaklarda arama; zaten CRM'de olanlar işaretlenir. */
export async function searchCandidates(query: string) {
  const usable = new Set(await listUsableModuleKeys());
  const [members, contacts] = await Promise.all([
    usable.has("members") ? searchMemberContacts(query, 15) : Promise.resolve([]),
    usable.has("accounting") ? searchContacts(query, 15) : Promise.resolve([]),
  ]);
  const candidates = [
    ...members.map((row) => ({ source: "members" as const, id: row.id, name: `${row.firstName} ${row.lastName}`.trim(), detail: row.membershipNumber })),
    ...contacts.map((row) => ({ source: "accounting" as const, id: row.id, name: row.name, detail: `${row.number}${row.contactPerson ? ` · ${row.contactPerson}` : ""}` })),
  ];
  const existing = await getDb().crmParty.findMany({
    where: { OR: candidates.map((row) => ({ sourceModule: row.source, sourceId: row.id })) },
    select: { sourceModule: true, sourceId: true, id: true },
  });
  return candidates.map((row) => ({ ...row, partyId: existing.find((item) => item.sourceModule === row.source && item.sourceId === row.id)?.id ?? null }));
}

export async function addParty(source: CrmSource, sourceId: string, actor: Actor) {
  const summary = (await resolveParties([{ sourceModule: source, sourceId }])).get(`${source}:${sourceId}`);
  if (!summary || summary.missing) return null;
  return getDb().crmParty.upsert({
    where: { sourceModule_sourceId: { sourceModule: source, sourceId } },
    create: { sourceModule: source, sourceId, createdById: actor.id },
    update: {},
    select: { id: true },
  });
}

export async function listParties(filter: { stage?: CrmStage | null; q?: string }) {
  const rows = await getDb().crmParty.findMany({
    where: filter.stage ? { stage: filter.stage } : {},
    include: {
      followUps: { where: { doneAt: null }, orderBy: { dueAt: "asc" }, take: 1, select: { dueAt: true } },
      _count: { select: { deals: { where: { stage: { in: ["OPEN", "PROPOSAL"] } } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  const summaries = await resolveParties(rows);
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

export async function getPartyDetail(id: string) {
  const party = await getDb().crmParty.findUnique({
    where: { id },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 100 },
      followUps: { orderBy: [{ doneAt: "asc" }, { dueAt: "asc" }], take: 50 },
    },
  });
  if (!party) return null;
  const summary = (await resolveParties([party])).get(`${party.sourceModule}:${party.sourceId}`)!;
  return { party, summary };
}

export async function updateParty(id: string, data: { stage?: CrmStage; ownerId?: string | null; tags?: string[] }) {
  await getDb().crmParty.update({ where: { id }, data: { ...data, ...(data.tags ? { tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20) } : {}) } });
}

export async function removeParty(id: string) {
  await getDb().crmParty.delete({ where: { id } });
}

export async function addActivity(partyId: string, input: { kind: CrmActivityKind; summary: string; occurredAt?: Date; dealId?: string | null }, actor: Actor) {
  await getDb().$transaction([
    getDb().crmActivity.create({ data: { partyId, kind: input.kind, summary: input.summary, occurredAt: input.occurredAt ?? new Date(), dealId: input.dealId ?? null, createdById: actor.id, createdByLabel: actor.label } }),
    getDb().crmParty.update({ where: { id: partyId }, data: { updatedAt: new Date() } }),
  ]);
}

export async function saveDeal(input: { id?: string; partyId: string; title: string; amountCents: number | null; expectedCloseAt: Date | null; ownerId?: string | null }) {
  const data = { title: input.title, amountCents: input.amountCents, expectedCloseAt: input.expectedCloseAt, ownerId: input.ownerId ?? null };
  if (input.id) return getDb().crmDeal.update({ where: { id: input.id }, data, select: { id: true } });
  return getDb().crmDeal.create({ data: { ...data, partyId: input.partyId }, select: { id: true } });
}

/** Aşama değişimi: zaman akışına not düşer ve otomasyon olayı yayımlanır. */
export async function moveDeal(id: string, stage: CrmDealStage, actor: Actor, note: string) {
  const db = getDb();
  await db.$transaction(async (tx) => {
    const deal = await tx.crmDeal.findUnique({ where: { id }, select: { stage: true, partyId: true } });
    if (!deal || deal.stage === stage) return;
    await tx.crmDeal.update({ where: { id }, data: { stage, closedAt: stage === "WON" || stage === "LOST" ? new Date() : null } });
    await tx.crmActivity.create({ data: { partyId: deal.partyId, dealId: id, kind: "OTHER", summary: note, createdById: actor.id, createdByLabel: actor.label } });
    await emitAutomationEvent(crmDealStageChangedEvent, { dealId: id, from: deal.stage, to: stage }, tx);
  });
}

export async function deleteDeal(id: string) {
  await getDb().crmDeal.delete({ where: { id } });
}

export async function addFollowUp(partyId: string, input: { dueAt: Date; note: string; dealId?: string | null; assigneeId?: string | null }) {
  await getDb().crmFollowUp.create({ data: { partyId, dueAt: input.dueAt, note: input.note, dealId: input.dealId ?? null, assigneeId: input.assigneeId ?? null } });
}

export async function completeFollowUp(id: string, done: boolean) {
  await getDb().crmFollowUp.update({ where: { id }, data: { doneAt: done ? new Date() : null } });
}

/** Fırsat panosu: aşamaya göre, kişi adlarıyla. */
export async function listDeals() {
  const deals = await getDb().crmDeal.findMany({ include: { party: { select: { id: true, sourceModule: true, sourceId: true } } }, orderBy: { updatedAt: "desc" }, take: 500 });
  const summaries = await resolveParties(deals.map((deal) => deal.party));
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
export async function listOpenFollowUps() {
  const rows = await getDb().crmFollowUp.findMany({ where: { doneAt: null }, include: { party: { select: { id: true, sourceModule: true, sourceId: true } } }, orderBy: { dueAt: "asc" }, take: 200 });
  const summaries = await resolveParties(rows.map((row) => row.party));
  return rows.map((row) => ({ id: row.id, dueAt: row.dueAt.toISOString(), note: row.note, partyId: row.party.id, partyName: summaries.get(`${row.party.sourceModule}:${row.party.sourceId}`)?.name ?? "—" }));
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
export async function dealStageTotals() {
  const rows = await getDb().crmDeal.groupBy({ by: ["stage"], _count: { _all: true }, _sum: { amountCents: true } });
  return Object.fromEntries(rows.map((row) => [row.stage, { count: row._count._all, amount: (row._sum.amountCents ?? 0) / 100 }]));
}
