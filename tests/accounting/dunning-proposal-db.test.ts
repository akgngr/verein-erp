/**
 * Sekreter ihtar önerisi (muhasebe): öneri → onay → AccountingDunning, gerçek veritabanı ve gerçek
 * şifreli öneri deposuyla. Yalnız izole test veritabanında (CI: AI_TEST_DATABASE_URL).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { secretary as accountingSecretary } from "@/modules/accounting/secretary";
import { createDunningForInvoice } from "@/modules/accounting/services/dunning-create";
import { proposalCrypto, prismaProposalStore } from "@/modules/secretary/services/proposal-store";
import { confirmProposal, ensureRuleProposal, type ProposalDeps } from "@/modules/secretary/services/proposals";
import { getDb } from "@/shared/db";
import type { Role } from "@/shared/roles";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) {
  throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");
}

const now = new Date();
const t = (key: string, values?: Record<string, string | number>) => `${key}${values?.count !== undefined ? `:${values.count}` : ""}`;

async function createOverdueInvoice(tag: string) {
  return getDb().accountingInvoice.create({
    data: {
      kind: "INVOICE",
      status: "ISSUED",
      issueDate: new Date("2001-01-01T00:00:00Z"),
      dueDate: new Date("2001-01-15T00:00:00Z"),
      recipientName: `GIZLI-${tag}`,
      grossCents: 10_000,
      createdById: "test",
      createdByLabel: "test",
    },
    select: { id: true },
  });
}

function deps(): ProposalDeps {
  return { store: prismaProposalStore(), crypto: proposalCrypto, registry: [accountingSecretary], usableModules: async () => ["accounting", "secretary"] };
}

async function propose(user: { id: string; role: Role }, invoiceIds: string[]) {
  return ensureRuleProposal(
    user,
    { moduleKey: "accounting", itemId: "accounting:overdue-invoices", action: "dunning", payload: { invoiceIds }, context: { user, now, t } },
    deps(),
    now,
  );
}

test("dunning proposal: onay ihtar kaydı oluşturur; çift onay ve bayat öneri çalışmaz", { skip: !enabled }, async () => {
  const db = getDb();
  const tag = randomUUID().slice(0, 8);
  const admin = { id: `user-${tag}`, role: "ADMIN" as Role };
  const invoiceIds: string[] = [];
  try {
    const first = await createOverdueInvoice(tag);
    const second = await createOverdueInvoice(tag);
    invoiceIds.push(first.id, second.id);

    // Yetki: yalnız görüntüleme yetkisi olan rol öneri almaz.
    assert.equal(await propose({ id: admin.id, role: "BOARD" }, [first.id]), undefined);

    const id = await propose(admin, [first.id]);
    assert.ok(id, "öneri oluştu");
    const row = await db.secretaryProposal.findUniqueOrThrow({ where: { id: id! } });
    assert.ok(!row.payloadEnc.includes(first.id) && !row.previewEnc.includes("GIZLI"), "payload ve önizleme şifreli");

    const result = await confirmProposal(admin, { id: id! }, deps(), now);
    assert.equal(result.href, "/muhasebe/faturalar");
    const dunnings = await db.accountingDunning.findMany({ where: { invoiceId: first.id } });
    assert.equal(dunnings.length, 1);
    assert.equal(dunnings[0].level, 1);
    assert.equal(dunnings[0].createdById, admin.id);
    await assert.rejects(() => confirmProposal(admin, { id: id! }, deps(), now), /unavailable/);

    // Bayat: öneri sonrası fatura başka yoldan ihtarlandı → kaynak durumu değişti, çalışmaz.
    const staleId = await propose(admin, [second.id]);
    await createDunningForInvoice(second.id, { id: "other", label: "other" }, new Date(now.toISOString().slice(0, 10) + "T00:00:00Z"));
    await assert.rejects(() => confirmProposal(admin, { id: staleId! }, deps(), now), /stale/);
    assert.equal(await db.accountingDunning.count({ where: { invoiceId: second.id } }), 1, "ikinci ihtar oluşmadı");
  } finally {
    await db.accountingDunning.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await db.accountingInvoice.deleteMany({ where: { id: { in: invoiceIds } } });
    await db.secretaryProposal.deleteMany({ where: { userId: admin.id } });
  }
});
