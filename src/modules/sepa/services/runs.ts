import "server-only";

import { Prisma } from "@prisma/client";

import { getSepaCreditorSettings } from "@/modules/accounting/server";
import { listDebitableCharges, recordSepaChargePayments, voidSepaChargePayment } from "@/modules/courses/server";
import { listDebitableDues, recordSepaDuePayments, voidSepaDuePayment } from "@/modules/members/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import { getGuardianIdsByDebtorNumber, getGuardianMandates } from "@/modules/students/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { checkMandate, DEFAULT_MAX_RETURNS, isReturnCode, type HealthIssue } from "../lib/mandate-health";
import { buildPain008, detectMandateIbanChange, isValidCreditorId, isValidIban, sepaText, type DebitTransaction } from "../lib/pain008";
import { loadMandateHistory } from "./history";

const XML_PURPOSE = "sepa-debit-xml";
export type Actor = { id: string; label: string };
export type Source = "MEMBER_DUES" | "COURSE_FEES";
export type SkipReason =
  | "noMandate"
  | "invalidIban"
  | "alreadyInRun"
  | "futureSignatureDate"
  | "missingDebtorName"
  | "dormant"
  | "renewAfterReturn"
  | "pausedAfterReturns";
/** Sağlık sorunlarından tahsilatı durduranlar (önizlemede atlanır). */
const HEALTH_SKIPS: readonly HealthIssue[] = ["futureSignatureDate", "dormant", "renewAfterReturn", "pausedAfterReturns"];
export type Candidate = { subject: { kind: "MEMBER" | "GUARDIAN"; subjectId: string } | null; sourceKey: string; debtorName: string; label: string; amountCents: number; iban: string | null; bic: string | null; holder: string | null; mandateReference: string | null; mandateDate: string | null; remittance: string };

export const mask = (iban: string) => `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;

/** Gläubiger bilgileri eksikse hangi ayarın eksik olduğunu döner. */
export async function creditorProblems(): Promise<string[]> {
  const settings = await getSepaCreditorSettings();
  const problems: string[] = [];
  if (!settings.iban || !isValidIban(settings.iban)) problems.push("ownIban");
  if (!settings.creditorId || !isValidCreditorId(settings.creditorId)) problems.push("creditorId");
  return problems;
}

export async function candidates(source: Source, param: string, labels: { dues: (year: number) => string; course: (code: string, label: string) => string }): Promise<Candidate[]> {
  const usable = new Set(await listUsableModuleKeys());
  if (source === "MEMBER_DUES") {
    if (!usable.has("members")) return [];
    const year = Number(param);
    return (await listDebitableDues(year)).map((due) => ({
      subject: { kind: "MEMBER" as const, subjectId: due.memberId }, sourceKey: `${due.memberId}:${year}`, debtorName: due.accountHolder ?? due.name, label: `${due.membershipNumber} ${due.name}`, amountCents: due.openCents,
      iban: due.iban, bic: due.bic, holder: due.accountHolder, mandateReference: due.mandateReference, mandateDate: due.mandateDate, remittance: `${labels.dues(year)} ${due.membershipNumber}`,
    }));
  }
  if (!usable.has("courses") || !usable.has("students")) return [];
  const charges = await listDebitableCharges(new Date(`${param}T23:59:59Z`));
  const debtorNumbers = [...new Set(charges.map((charge) => charge.debtorNumber).filter((value): value is number => value !== null))];
  const [mandates, guardianIds] = await Promise.all([getGuardianMandates(debtorNumbers), getGuardianIdsByDebtorNumber(debtorNumbers)]);
  return charges.map((charge) => {
    const guardian = charge.debtorNumber !== null ? mandates.get(charge.debtorNumber) : undefined;
    const guardianId = charge.debtorNumber !== null ? guardianIds.get(charge.debtorNumber) : undefined;
    return {
      subject: guardianId ? { kind: "GUARDIAN" as const, subjectId: guardianId } : null,
      sourceKey: charge.chargeId, debtorName: guardian?.accountHolder ?? guardian?.name ?? "", label: `${charge.courseCode} · ${charge.label}${guardian ? ` · ${guardian.name}` : ""}`, amountCents: charge.amountCents,
      iban: guardian?.iban ?? null, bic: guardian?.bic ?? null, holder: guardian?.accountHolder ?? null, mandateReference: guardian?.mandateReference ?? null, mandateDate: guardian?.mandateDate ?? null,
      remittance: `${labels.course(charge.courseCode, charge.label)}${charge.debtorNumber ? ` Debitor ${charge.debtorNumber}` : ""}`,
    };
  });
}

/** Önizleme: tahsil edilebilir kalemler ve atlananlar (gerekçeli). IBAN maskeli döner. */
export async function previewRun(source: Source, param: string, labels: Parameters<typeof candidates>[2], maxReturns = DEFAULT_MAX_RETURNS) {
  const list = await candidates(source, param, labels);
  const history = await loadMandateHistory(source, list);
  const today = new Date();
  const healthSkip = (item: Candidate): SkipReason | undefined => {
    const issues = checkMandate(item, { today, maxReturns, ...history.for(item) });
    return HEALTH_SKIPS.find((issue) => issues.includes(issue)) as SkipReason | undefined;
  };
  const mandateRefs = [...new Set(list.map((item) => item.mandateReference).filter((ref): ref is string => Boolean(ref)))];
  const previousMandateItems = mandateRefs.length
    ? await getDb().sepaDebitItem.findMany({
        where: { mandateReference: { in: mandateRefs }, run: { status: { not: "CANCELLED" } } },
        orderBy: { run: { createdAt: "desc" } },
        distinct: ["mandateReference"],
        select: { mandateReference: true, ibanMasked: true },
      })
    : [];
  const previousByMandate = new Map(previousMandateItems.map((row) => [row.mandateReference, row.ibanMasked]));
  const pending = new Set((await getDb().sepaDebitItem.findMany({ where: { sourceKey: { in: list.map((item) => item.sourceKey) }, status: "PENDING", run: { status: "CREATED" } }, select: { sourceKey: true } })).map((row) => row.sourceKey));
  const ready: (Omit<Candidate, "iban" | "bic" | "subject"> & { ibanMasked: string; ibanAmended: boolean })[] = [];
  const skipped: { label: string; amountCents: number; reason: SkipReason }[] = [];
  for (const item of list) {
    const skipHealth = healthSkip(item);
    if (pending.has(item.sourceKey)) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "alreadyInRun" });
    else if (!item.iban || !item.mandateReference || !item.mandateDate) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "noMandate" });
    else if (!isValidIban(item.iban)) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "invalidIban" });
    else if (!sepaText(item.holder ?? item.debtorName, 70)) skipped.push({ label: item.label, amountCents: item.amountCents, reason: "missingDebtorName" });
    else if (skipHealth) skipped.push({ label: item.label, amountCents: item.amountCents, reason: skipHealth });
    else {
      const { iban, bic: _bic, subject: _subject, ...rest } = item;
      const ibanMasked = mask(iban);
      const ibanAmended = detectMandateIbanChange(ibanMasked, previousByMandate, item.mandateReference);
      ready.push({ ...rest, ibanMasked, ibanAmended });
    }
  }
  return { ready, skipped, totalCents: ready.reduce((sum, item) => sum + item.amountCents, 0) };
}

/** Çalıştırma oluşturur: XML üretilip şifreli saklanır (atomik pending kontrolü + P2002 sıra retry). */
export async function createRun(source: Source, param: string, collectionDate: string, sourceKeys: string[] | null, actor: Actor, labels: Parameters<typeof candidates>[2], maxReturns = DEFAULT_MAX_RETURNS) {
  const settings = await getSepaCreditorSettings();
  const org = await getOrganizationProfile();
  const preview = await previewRun(source, param, labels, maxReturns);
  const wanted = sourceKeys ? new Set(sourceKeys) : null;
  const all = await candidates(source, param, labels);
  const readyByKey = new Map(preview.ready.map((ready) => [ready.sourceKey, ready]));
  const initialChosen = all.filter((item) => readyByKey.has(item.sourceKey) && (!wanted || wanted.has(item.sourceKey)));
  if (!initialChosen.length) return null;
  const db = getDb();
  const year = Number(collectionDate.slice(0, 4));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        // Re-check pending items inside the transaction to prevent double-including open items concurrently (#578).
        const stillPending = new Set(
          (
            await tx.sepaDebitItem.findMany({
              where: { sourceKey: { in: initialChosen.map((item) => item.sourceKey) }, status: "PENDING", run: { status: "CREATED" } },
              select: { sourceKey: true },
            })
          ).map((row) => row.sourceKey),
        );
        const chosen = initialChosen.filter((item) => !stillPending.has(item.sourceKey));
        if (!chosen.length) return null;

        const last = await tx.sepaDebitRun.findFirst({ where: { year }, orderBy: { sequence: "desc" }, select: { sequence: true } });
        const sequence = (last?.sequence ?? 0) + 1;
        const number = `LS-${year}-${String(sequence).padStart(4, "0")}`;
        const transactions: DebitTransaction[] = chosen.map((item, index) => ({
          endToEndId: `${number}-${index + 1}`,
          amountCents: item.amountCents,
          mandateId: item.mandateReference!,
          mandateDate: item.mandateDate!,
          debtorName: item.holder ?? item.debtorName,
          debtorIban: item.iban!,
          debtorBic: item.bic,
          remittance: item.remittance,
          amendment: readyByKey.get(item.sourceKey)?.ibanAmended ? {} : undefined,
        }));
        const xml = buildPain008({
          messageId: number,
          createdAt: new Date(),
          collectionDate,
          creditor: { name: org.name, iban: settings.iban!, bic: settings.bic, creditorId: settings.creditorId! },
          transactions,
        });
        return await tx.sepaDebitRun.create({
          data: {
            number,
            year,
            sequence,
            source,
            sourceParam: param,
            collectionDate: new Date(`${collectionDate}T00:00:00Z`),
            totalCents: transactions.reduce((sum, t) => sum + t.amountCents, 0),
            itemCount: transactions.length,
            xmlEnc: sealSecret(XML_PURPOSE, xml),
            createdById: actor.id,
            createdByLabel: actor.label,
            items: {
              create: chosen.map((item, index) => ({
                sourceKey: item.sourceKey,
                debtorName: item.label,
                ibanMasked: mask(item.iban!),
                mandateReference: item.mandateReference!,
                amountCents: item.amountCents,
                endToEndId: transactions[index].endToEndId,
                remittance: item.remittance,
              })),
            },
          },
          select: { id: true, number: true },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) {
        continue;
      }
      throw error;
    }
  }
  return null;
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
    items: items.map((item) => ({ id: item.id, debtorName: item.debtorName, ibanMasked: item.ibanMasked, mandateReference: item.mandateReference, amountCents: item.amountCents, endToEndId: item.endToEndId, status: item.status, receipt: item.receipt, returnReason: item.returnReason, returnCode: item.returnCode, returnFeeCents: item.returnFeeCents })),
  };
}

/** Banka tahsil etti: tüm bekleyen kalemler atomik ve idempotent tek transaction içinde kaydedilir (#578). */
export async function markCollected(id: string, collectedAt: string, actor: Actor) {
  const db = getDb();
  const paidAt = new Date(`${collectedAt}T00:00:00Z`);
  return db.$transaction(
    async (tx) => {
      // Atomic status claim prevents concurrent double-collection races.
      const claimed = await tx.sepaDebitRun.updateMany({
        where: { id, status: "CREATED" },
        data: { status: "COLLECTED", collectedAt: paidAt },
      });
      if (claimed.count !== 1) return false;

      const run = await tx.sepaDebitRun.findUnique({
        where: { id },
        include: { items: { where: { status: "PENDING" } } },
      });
      if (!run) return false;

      const receipts =
        run.source === "MEMBER_DUES"
          ? await recordSepaDuePayments(
              run.items.map((item) => {
                const [memberId, year] = item.sourceKey.split(":");
                return { memberId, year: Number(year), amountCents: item.amountCents, reference: item.endToEndId };
              }),
              paidAt,
              actor,
              tx,
            )
          : await recordSepaChargePayments(
              run.items.map((item) => ({ chargeId: item.sourceKey, reference: item.endToEndId })),
              paidAt,
              actor,
              tx,
            );

      for (const item of run.items) {
        await tx.sepaDebitItem.update({
          where: { id: item.id },
          data: { status: "COLLECTED", receipt: receipts[item.endToEndId] ?? null },
        });
      }
      return true;
    },
    { timeout: 30_000 },
  );
}

/** Rücklastschrift: kalemin ödemesi atomik olarak iptal edilir, borç yeniden açılır ve runId eşleşmesi doğrulanır (#578). */
export async function markReturned(
  runId: string,
  itemId: string,
  input: { reason: string; code: string | null; feeCents: number | null },
  actor: Actor,
) {
  const reason = input.reason;
  const code = input.code && isReturnCode(input.code) ? input.code : null;
  const db = getDb();
  return db.$transaction(async (tx) => {
    const item = await tx.sepaDebitItem.findUnique({
      where: { id: itemId },
      include: { run: { select: { id: true, source: true, status: true } } },
    });
    if (!item || item.runId !== runId || item.status !== "COLLECTED") return false;

    const claimed = await tx.sepaDebitItem.updateMany({
      where: { id: itemId, runId, status: "COLLECTED" },
      data: {
        status: "RETURNED",
        returnReason: reason,
        returnCode: code,
        returnFeeCents: input.feeCents,
        returnedAt: new Date(),
      },
    });
    if (claimed.count !== 1) return false;

    if (item.run.source === "MEMBER_DUES") {
      const [memberId, year] = item.sourceKey.split(":");
      await voidSepaDuePayment(memberId, Number(year), item.endToEndId, reason, actor, tx);
    } else {
      await voidSepaChargePayment(item.sourceKey, item.endToEndId, reason, actor, tx);
    }
    return true;
  });
}

export async function cancelRun(id: string) {
  const result = await getDb().sepaDebitRun.updateMany({ where: { id, status: "CREATED" }, data: { status: "CANCELLED" } });
  return result.count === 1;
}
