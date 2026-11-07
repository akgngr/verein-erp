import "server-only";

import { getSepaCreditorSettings } from "@/modules/accounting/server";
import { listDebitableCharges, recordSepaChargePayments, voidSepaChargePayment } from "@/modules/courses/server";
import { listDebitableDues, recordSepaDuePayments, voidSepaDuePayment } from "@/modules/members/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import { getGuardianMandates } from "@/modules/students/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { buildPain008, isValidCreditorId, isValidIban, type DebitTransaction } from "../lib/pain008";

const XML_PURPOSE = "sepa-debit-xml";
export type Actor = { id: string; label: string };
export type Source = "MEMBER_DUES" | "COURSE_FEES";
export type SkipReason = "noMandate" | "invalidIban" | "alreadyInRun";
type Candidate = { sourceKey: string; debtorName: string; label: string; amountCents: number; iban: string | null; bic: string | null; holder: string | null; mandateReference: string | null; mandateDate: string | null; remittance: string };

const mask = (iban: string) => `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;

/** Gläubiger bilgileri eksikse hangi ayarın eksik olduğunu döner. */
export async function creditorProblems(): Promise<string[]> {
  const settings = await getSepaCreditorSettings();
  const problems: string[] = [];
  if (!settings.iban || !isValidIban(settings.iban)) problems.push("ownIban");
  if (!settings.creditorId || !isValidCreditorId(settings.creditorId)) problems.push("creditorId");
  return problems;
}

async function candidates(source: Source, param: string, labels: { dues: (year: number) => string; course: (code: string, label: string) => string }): Promise<Candidate[]> {
  const usable = new Set(await listUsableModuleKeys());
  if (source === "MEMBER_DUES") {
    if (!usable.has("members")) return [];
    const year = Number(param);
    return (await listDebitableDues(year)).map((due) => ({
      sourceKey: `${due.memberId}:${year}`, debtorName: due.accountHolder ?? due.name, label: `${due.membershipNumber} ${due.name}`, amountCents: due.openCents,
      iban: due.iban, bic: due.bic, holder: due.accountHolder, mandateReference: due.mandateReference, mandateDate: due.mandateDate, remittance: `${labels.dues(year)} ${due.membershipNumber}`,
    }));
  }
  if (!usable.has("courses") || !usable.has("students")) return [];
  const charges = await listDebitableCharges(new Date(`${param}T23:59:59Z`));
  const mandates = await getGuardianMandates([...new Set(charges.map((charge) => charge.debtorNumber).filter((value): value is number => value !== null))]);
  return charges.map((charge) => {
    const guardian = charge.debtorNumber !== null ? mandates.get(charge.debtorNumber) : undefined;
    return {
      sourceKey: charge.chargeId, debtorName: guardian?.accountHolder ?? "—", label: `${charge.courseCode} · ${charge.label}${guardian ? ` · ${guardian.name}` : ""}`, amountCents: charge.amountCents,
      iban: guardian?.iban ?? null, bic: guardian?.bic ?? null, holder: guardian?.accountHolder ?? null, mandateReference: guardian?.mandateReference ?? null, mandateDate: guardian?.mandateDate ?? null,
      remittance: `${labels.course(charge.courseCode, charge.label)}${charge.debtorNumber ? ` Debitor ${charge.debtorNumber}` : ""}`,
    };
  });
}

/** Önizleme: tahsil edilebilir kalemler ve atlananlar (gerekçeli). IBAN maskeli döner. */
export async function previewRun(source: Source, param: string, labels: Parameters<typeof candidates>[2]) {
  const list = await candidates(source, param, labels);
  const pending = new Set((await getDb().sepaDebitItem.findMany({ where: { sourceKey: { in: list.map((item) => item.sourceKey) }, status: "PENDING", run: { status: "CREATED" } }, select: { sourceKey: true } })).map((row) => row.sourceKey));
  const ready: (Omit<Candidate, "iban" | "bic"> & { ibanMasked: string })[] = [];
  const skipped: { label: string; amountCents: number; reason: SkipReason }[] = [];
  for (const item of list) {
    if (pending.has(item.sourceKey)) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "alreadyInRun" });
    else if (!item.iban || !item.mandateReference || !item.mandateDate) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "noMandate" });
    else if (!isValidIban(item.iban)) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "invalidIban" });
    else {
      const { iban, bic: _bic, ...rest } = item;
      ready.push({ ...rest, ibanMasked: mask(iban) });
    }
  }
  return { ready, skipped, totalCents: ready.reduce((sum, item) => sum + item.amountCents, 0) };
}

/** Çalıştırma oluşturur: XML üretilip şifreli saklanır. */
export async function createRun(source: Source, param: string, collectionDate: string, sourceKeys: string[] | null, actor: Actor, labels: Parameters<typeof candidates>[2]) {
  const settings = await getSepaCreditorSettings();
  const org = await getOrganizationProfile();
  const preview = await previewRun(source, param, labels);
  const wanted = sourceKeys ? new Set(sourceKeys) : null;
  const all = await candidates(source, param, labels);
  const chosen = all.filter((item) => preview.ready.some((ready) => ready.sourceKey === item.sourceKey) && (!wanted || wanted.has(item.sourceKey)));
  if (!chosen.length) return null;
  const db = getDb();
  const year = Number(collectionDate.slice(0, 4));
  return db.$transaction(async (tx) => {
    const last = await tx.sepaDebitRun.findFirst({ where: { year }, orderBy: { sequence: "desc" }, select: { sequence: true } });
    const sequence = (last?.sequence ?? 0) + 1;
    const number = `LS-${year}-${String(sequence).padStart(4, "0")}`;
    const transactions: DebitTransaction[] = chosen.map((item, index) => ({
      endToEndId: `${number}-${index + 1}`, amountCents: item.amountCents, mandateId: item.mandateReference!, mandateDate: item.mandateDate!,
      debtorName: item.holder ?? item.debtorName, debtorIban: item.iban!, debtorBic: item.bic, remittance: item.remittance,
    }));
    const xml = buildPain008({ messageId: number, createdAt: new Date(), collectionDate, creditor: { name: org.name, iban: settings.iban!, bic: settings.bic, creditorId: settings.creditorId! }, transactions });
    return tx.sepaDebitRun.create({
      data: {
        number, year, sequence, source, sourceParam: param, collectionDate: new Date(`${collectionDate}T00:00:00Z`), totalCents: transactions.reduce((sum, tx) => sum + tx.amountCents, 0), itemCount: transactions.length,
        xmlEnc: sealSecret(XML_PURPOSE, xml), createdById: actor.id, createdByLabel: actor.label,
        items: { create: chosen.map((item, index) => ({ sourceKey: item.sourceKey, debtorName: item.label, ibanMasked: mask(item.iban!), mandateReference: item.mandateReference!, amountCents: item.amountCents, endToEndId: transactions[index].endToEndId, remittance: item.remittance })) },
      },
      select: { id: true, number: true },
    });
  });
}

export async function getRunXml(id: string) {
  const row = await getDb().sepaDebitRun.findUnique({ where: { id }, select: { number: true, xmlEnc: true } });
  const xml = row ? openSecret(XML_PURPOSE, row.xmlEnc) : null;
  return row && xml ? { number: row.number, xml } : null;
}

export async function listRuns() {
  const rows = await getDb().sepaDebitRun.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { items: { select: { status: true } } } });
  return rows.map((row) => ({
    id: row.id, number: row.number, source: row.source, sourceParam: row.sourceParam, collectionDate: row.collectionDate.toISOString().slice(0, 10), status: row.status,
    totalCents: row.totalCents, itemCount: row.itemCount, returned: row.items.filter((item) => item.status === "RETURNED").length, createdAt: row.createdAt.toISOString(), createdByLabel: row.createdByLabel,
  }));
}

export async function getRun(id: string) {
  const row = await getDb().sepaDebitRun.findUnique({ where: { id }, include: { items: { orderBy: { endToEndId: "asc" } } } });
  if (!row) return null;
  const { xmlEnc: _xml, items, ...rest } = row;
  return {
    ...rest, collectionDate: row.collectionDate.toISOString().slice(0, 10), collectedAt: row.collectedAt?.toISOString().slice(0, 10) ?? null, createdAt: row.createdAt.toISOString(),
    items: items.map((item) => ({ id: item.id, debtorName: item.debtorName, ibanMasked: item.ibanMasked, mandateReference: item.mandateReference, amountCents: item.amountCents, endToEndId: item.endToEndId, status: item.status, receipt: item.receipt, returnReason: item.returnReason })),
  };
}

/** Banka tahsil etti: tüm bekleyen kalemler ödeme olarak kaynak modüllere yazılır. */
export async function markCollected(id: string, collectedAt: string, actor: Actor) {
  const db = getDb();
  const run = await db.sepaDebitRun.findUnique({ where: { id }, include: { items: { where: { status: "PENDING" } } } });
  if (!run || run.status !== "CREATED") return false;
  const paidAt = new Date(`${collectedAt}T00:00:00Z`);
  const receipts = run.source === "MEMBER_DUES"
    ? await recordSepaDuePayments(run.items.map((item) => { const [memberId, year] = item.sourceKey.split(":"); return { memberId, year: Number(year), amountCents: item.amountCents, reference: item.endToEndId }; }), paidAt, actor)
    : await recordSepaChargePayments(run.items.map((item) => ({ chargeId: item.sourceKey, reference: item.endToEndId })), paidAt, actor);
  await db.$transaction([
    ...run.items.map((item) => db.sepaDebitItem.update({ where: { id: item.id }, data: { status: "COLLECTED", receipt: receipts[item.endToEndId] ?? null } })),
    db.sepaDebitRun.update({ where: { id }, data: { status: "COLLECTED", collectedAt: paidAt } }),
  ]);
  return true;
}

/** Rücklastschrift: kalemin ödemesi iptal edilir, borç yeniden açılır. */
export async function markReturned(itemId: string, reason: string, actor: Actor) {
  const db = getDb();
  const item = await db.sepaDebitItem.findUnique({ where: { id: itemId }, include: { run: { select: { source: true, status: true } } } });
  if (!item || item.status !== "COLLECTED") return false;
  if (item.run.source === "MEMBER_DUES") {
    const [memberId, year] = item.sourceKey.split(":");
    await voidSepaDuePayment(memberId, Number(year), item.endToEndId, reason, actor);
  } else {
    await voidSepaChargePayment(item.sourceKey, item.endToEndId, reason, actor);
  }
  await db.sepaDebitItem.update({ where: { id: itemId }, data: { status: "RETURNED", returnReason: reason } });
  return true;
}

export async function cancelRun(id: string) {
  const result = await getDb().sepaDebitRun.updateMany({ where: { id, status: "CREATED" }, data: { status: "CANCELLED" } });
  return result.count === 1;
}
