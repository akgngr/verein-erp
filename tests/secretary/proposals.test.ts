import assert from "node:assert/strict";
import { test } from "node:test";

import { z } from "zod";

import { getBriefing } from "@/modules/secretary/services/briefing";
import {
  confirmProposal,
  dismissProposal,
  ensureRuleProposal,
  listPendingProposals,
  type ProposalDeps,
  ProposalError,
  type ProposalRow,
  type ProposalStore,
} from "@/modules/secretary/services/proposals";
import { definePermissions } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { defineModuleSecretary, defineSecretaryAction, type ModuleSecretary, validateModuleSecretary } from "@/shared/secretary/define";

const invoicePermissions = definePermissions("invoicesTest", {
  ADMIN: ["view", "update"], BOARD: ["view"], SECRETARY: [], TREASURER: ["view", "update"], AUDITOR: ["view"], TEACHER: [], VIEWER: [],
});

function memoryStore() {
  const rows: ProposalRow[] = [];
  const store: ProposalStore = {
    findByKey: async (key) => rows.find((row) => row.idempotencyKey === key) ?? null,
    findOwn: async (id, userId) => rows.find((row) => row.id === id && row.userId === userId) ?? null,
    create: async (data) => {
      const row: ProposalRow = { ...data, id: `p${rows.length + 1}`, status: "PENDING" };
      rows.push(row);
      return { id: row.id };
    },
    transition: async (id, userId, from, to) => {
      const row = rows.find((entry) => entry.id === id && entry.userId === userId && entry.status === from);
      if (!row) return false;
      row.status = to;
      return true;
    },
    listPending: async (userId, now) => rows.filter((row) => row.userId === userId && row.status === "PENDING" && row.expiresAt > now),
  };
  return { rows, store };
}

// Test şifrelemesi: sızıntı denetimi için düz metni gizleyen basit, geri çevrilebilir kodlama.
const crypto = { seal: (plain: string) => `sealed:${Buffer.from(plain).toString("base64")}`, open: (sealed: string) => sealed.startsWith("sealed:") ? Buffer.from(sealed.slice(7), "base64").toString() : null };

function setup(options: { risk?: "internal" | "external"; executeFails?: boolean } = {}) {
  const source = { status: "OVERDUE", version: 1 };
  const executed: string[] = [];
  const action = defineSecretaryAction({
    key: "remind",
    permission: { definition: invoicePermissions, action: "update" },
    risk: options.risk ?? "internal",
    schema: z.object({ invoiceId: z.string() }),
    preview: async (payload) => ({ title: `Hatırlatma taslağı ${payload.invoiceId}` }),
    snapshot: async () => (source.status === "GONE" ? null : { ...source }),
    execute: async (payload) => {
      if (options.executeFails) throw new Error("db down");
      executed.push(payload.invoiceId);
      return { href: `/muhasebe/faturalar/${payload.invoiceId}` };
    },
  });
  const registry: ModuleSecretary[] = [defineModuleSecretary({ module: "accounting", providers: [], actions: [action] })];
  const { rows, store } = memoryStore();
  let usable = ["accounting", "secretary"];
  const deps: ProposalDeps = { store, crypto, registry, usableModules: async () => usable };
  return { source, executed, registry, rows, deps, disableModule: () => { usable = ["secretary"]; } };
}

const admin: { id: string; role: Role } = { id: "u1", role: "ADMIN" };
const now = new Date("2026-11-18T08:00:00Z");
const context = { user: admin, now, t: (key: string) => key };

async function propose(env: ReturnType<typeof setup>, user: { id: string; role: Role } = admin, at = now) {
  return ensureRuleProposal(user, { moduleKey: "accounting", itemId: "accounting:overdue-invoice:inv1", action: "remind", payload: { invoiceId: "inv1" }, context }, env.deps, at);
}

test("proposals: sözleşme eylem anahtarı ve risk alanını doğrular", () => {
  const env = setup();
  assert.deepEqual(validateModuleSecretary("accounting", env.registry[0]), []);
  const bad = defineModuleSecretary({ module: "accounting", providers: [], actions: [{ ...env.registry[0].actions![0], key: "Bad Key", risk: "maybe" as never }] });
  assert.deepEqual(validateModuleSecretary("accounting", bad), ["action-key:Bad Key", "action-risk:Bad Key"]);
});

test("proposals: oluşturma idempotent, şifreli ve yetkiye bağlı", async () => {
  const env = setup();
  const first = await propose(env);
  assert.equal(first, "p1");
  assert.equal(await propose(env), "p1");
  assert.equal(env.rows.length, 1);
  assert.ok(!env.rows[0].payloadEnc.includes("inv1"), "payload düz metin saklanmaz");
  assert.ok(!env.rows[0].previewEnc.includes("inv1"));
  // Eylem yetkisi olmayan rol öneri almaz; sekreter yetkisi olmayan da.
  assert.equal(await propose(env, { id: "u2", role: "BOARD" }), undefined);
  assert.equal(await propose(env, { id: "u3", role: "VIEWER" }), undefined);
  // Geçersiz payload veya bilinmeyen eylem öneri üretmez.
  assert.equal(await ensureRuleProposal(admin, { moduleKey: "accounting", itemId: "accounting:x", action: "remind", payload: { invoiceId: 5 }, context }, env.deps, now), undefined);
  assert.equal(await ensureRuleProposal(admin, { moduleKey: "accounting", itemId: "accounting:x", action: "nope", payload: {}, context }, env.deps, now), undefined);
  // Reddedilen öneri aynı durum için yeniden doğmaz.
  assert.equal(await dismissProposal(admin, "p1", env.deps, now), true);
  assert.equal(await propose(env), undefined);
});

test("proposals: onay hedef eylemi bir kez çalıştırır; çift onay reddedilir", async () => {
  const env = setup();
  const id = (await propose(env))!;
  const result = await confirmProposal(admin, { id }, env.deps, now);
  assert.equal(result.href, "/muhasebe/faturalar/inv1");
  assert.deepEqual(env.executed, ["inv1"]);
  assert.equal(env.rows[0].status, "APPLIED");
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, now), /unavailable/);
  // Paralel ikinci istek: aynı anda iki onay → yalnız biri çalışır.
  const env2 = setup();
  const id2 = (await propose(env2))!;
  const outcomes = await Promise.allSettled([confirmProposal(admin, { id: id2 }, env2.deps, now), confirmProposal(admin, { id: id2 }, env2.deps, now)]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  assert.deepEqual(env2.executed, ["inv1"]);
});

test("proposals: başka kullanıcının önerisi onaylanamaz ve reddedilemez", async () => {
  const env = setup();
  const id = (await propose(env))!;
  await assert.rejects(() => confirmProposal({ id: "other", role: "ADMIN" }, { id }, env.deps, now), /unavailable/);
  assert.equal(await dismissProposal({ id: "other" }, id, env.deps, now), false);
  assert.equal(env.rows[0].status, "PENDING");
});

test("proposals: kaynak değiştiyse veya silindiyse öneri bayattır ve çalışmaz", async () => {
  const env = setup();
  const id = (await propose(env))!;
  env.source.version = 2;
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, now), /stale/);
  assert.equal(env.rows[0].status, "EXPIRED");
  assert.deepEqual(env.executed, []);

  const env2 = setup();
  const id2 = (await propose(env2))!;
  env2.source.status = "GONE";
  await assert.rejects(() => confirmProposal(admin, { id: id2 }, env2.deps, now), /stale/);
  assert.deepEqual(env2.executed, []);
});

test("proposals: geri alınmış yetki ve kapatılan modül çalıştırmayı engeller", async () => {
  const env = setup();
  const id = (await propose(env))!;
  await assert.rejects(() => confirmProposal({ id: "u1", role: "AUDITOR" }, { id }, env.deps, now), /forbidden/);
  env.disableModule();
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, now), /forbidden/);
  assert.equal(env.rows[0].status, "PENDING");
  assert.deepEqual(env.executed, []);
  assert.deepEqual(await listPendingProposals(admin, env.deps, now), []);
});

test("proposals: süresi dolmuş öneri çalışmaz", async () => {
  const env = setup();
  const id = (await propose(env))!;
  const later = new Date(now.getTime() + 8 * 86_400_000);
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, later), /expired/);
  assert.equal(env.rows[0].status, "EXPIRED");
  assert.deepEqual(env.executed, []);
});

test("proposals: dışa etkili eylem açık ek onay olmadan çalışmaz", async () => {
  const env = setup({ risk: "external" });
  const id = (await propose(env))!;
  const [view] = await listPendingProposals(admin, env.deps, now);
  assert.equal(view.risk, "external");
  assert.equal(view.title, "Hatırlatma taslağı inv1");
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, now), /externalConfirmRequired/);
  assert.equal(env.rows[0].status, "PENDING");
  await confirmProposal(admin, { id, confirmExternal: true }, env.deps, now);
  assert.deepEqual(env.executed, ["inv1"]);
});

test("proposals: başarısız eylem tekrar denenmez (FAILED) ve kurcalanmış payload reddedilir", async () => {
  const env = setup({ executeFails: true });
  const id = (await propose(env))!;
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, now), (error: unknown) => error instanceof ProposalError && /failed/.test(error.message));
  assert.equal(env.rows[0].status, "FAILED");
  await assert.rejects(() => confirmProposal(admin, { id }, env.deps, now), /unavailable/);

  const env2 = setup();
  const id2 = (await propose(env2))!;
  env2.rows[0].payloadEnc = crypto.seal(JSON.stringify({ invoiceId: "inv-evil" }));
  await assert.rejects(() => confirmProposal(admin, { id: id2 }, env2.deps, now), /unreadable/);
  assert.deepEqual(env2.executed, []);
});

test("briefing: öğe önerisi istemciye yalnız proposalId olarak gider", async () => {
  const env = setup();
  const registry: ModuleSecretary[] = [defineModuleSecretary({
    module: "accounting",
    providers: [{
      key: "finance",
      permission: { definition: invoicePermissions, action: "view" },
      collect: async () => [
        { id: "accounting:overdue-invoice:inv1", module: "accounting", kind: "overdue-invoice", severity: "danger", title: "x", href: "/muhasebe", suggestion: { action: "remind", payload: { invoiceId: "inv1" } } },
        { id: "accounting:plain", module: "accounting", kind: "plain", severity: "info", title: "y", href: "/muhasebe" },
      ],
    }],
    actions: env.registry[0].actions,
  })];
  const briefing = await getBriefing(admin, now, {
    registry,
    usableModules: async () => ["accounting"],
    itemStates: async () => [],
    translator: async () => (key) => key,
    proposals: ({ moduleKey, item, suggestion, context: ctx }) =>
      ensureRuleProposal(admin, { moduleKey, itemId: item.id, action: suggestion.action, payload: suggestion.payload, context: ctx }, { ...env.deps, registry }, now),
  });
  const items = briefing.sections[0].items;
  assert.equal(items[0].proposalId, "p1");
  assert.equal(items[1].proposalId, undefined);
  assert.ok(!JSON.stringify(briefing).includes("suggestion"));
  assert.ok(!JSON.stringify(briefing).includes("invoiceId"));
});
