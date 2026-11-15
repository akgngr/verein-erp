import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { cloudToolEligible } from "@/modules/ai/services/cloud-policy";
import fs from "node:fs";

import { AI_TOOL_POLICY } from "@/shared/data-policy";
import { memberProfileAiTool, MEMBER_PROFILE_AI_FIELDS } from "@/modules/members/services/member-profile-ai-tool";

type Gate = Parameters<typeof cloudToolEligible>[0];
const screened = { textMode: "SCREENED" as const, pseudonymousRecords: false };

// accounting/ai.ts sunucu bağımlılıkları (next-intl) test ortamında yüklenemez; sözleşme kaynak + politika tablosundan denetlenir.
test("muhasebe araçları v2 ve denetimli bulut modunda kullanılabilir (yalnız toplamlar)", () => {
  const source = fs.readFileSync("src/modules/accounting/ai.ts", "utf8");
  assert.match(source, /defineModuleAiV2\(/);
  assert.doesNotMatch(source, /\baiTool\(/);
  const names = [...source.matchAll(/name: "([a-z_]+)"/g)].map((match) => match[1]);
  assert.equal(names.length, 6);
  for (const name of names) {
    const policy = AI_TOOL_POLICY[name as keyof typeof AI_TOOL_POLICY] as { modelFields?: readonly string[] };
    assert.ok(policy?.modelFields?.length, name);
    for (const field of policy.modelFields!) assert.doesNotMatch(field, /contact|counterparty|iban|purpose|supplier|customer|name/i, `${name}.${field}`);
    assert.equal(cloudToolEligible({ name, contractVersion: 2, modelDataClass: "aggregate" }, screened), true);
  }
  assert.equal((source.match(/modelDataClass|policy\("/g) ?? []).length >= 6, true);
});

test("üye profili aracı takma adlıdır: yalnız 'takma adlı kişi verisi' açıkken, ad/iletişim alanı yok", () => {
  const gate: Gate = { name: memberProfileAiTool.name, contractVersion: 2, modelDataClass: memberProfileAiTool.policy.modelDataClass };
  assert.equal(gate.modelDataClass, "pseudonymous");
  assert.equal(cloudToolEligible(gate, screened), false);
  assert.equal(cloudToolEligible(gate, { ...screened, pseudonymousRecords: true }), true);
  for (const field of MEMBER_PROFILE_AI_FIELDS) assert.doesNotMatch(field, /name|email|phone|street|city|birth|iban|kimlik|number|note/i, field);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("Use an isolated database");

test("üye profili: ad parçasıyla bulur, modele ad değil takma ad gider", { skip: !enabled }, async () => {
  const { getDb } = await import("@/shared/db");
  const db = getDb();
  const id = `profile-${randomUUID()}`;
  const member = await db.member.create({ data: { year: 2096, sequence: Math.floor(Math.random() * 1e8), membershipNumber: id, firstName: "Zyxwsentinel", lastName: "Nurimfile", email: "secret@example.test", joinDate: new Date("2019-03-01"), createdById: id, createdByLabel: "Test", dues: { create: { year: 2096, amountDue: 60, dueDate: new Date("2096-02-15"), createdById: id, createdByLabel: "Test" } } } });
  try {
    const aliases = new Map<string, string>();
    const context = {
      user: { id, name: "Actor", email: `${id}@example.test`, role: "ADMIN" as const },
      pseudonym: async (_resource: string, recordId: string) => { if (!aliases.has(recordId)) aliases.set(recordId, `[[K${aliases.size + 1}]]`); return aliases.get(recordId)!; },
      resolvePseudonym: async (_resource: string, alias: string) => { const hit = [...aliases].find(([, value]) => value === alias); if (!hit) throw new Error("AI_ALIAS_UNAVAILABLE"); return hit[0]; },
      restore: (text: string) => text, propose: () => {}, attachFile: () => {},
      loadDatasetDefinition: async () => null, createDataset: async () => "",
    };
    const byName = await memberProfileAiTool.run({ name: "zyxwsentinel" }, context as never) as { matches: number; people: Array<{ person: string; memberSinceYear: number; dues: unknown[] }> };
    assert.equal(byName.matches, 1);
    assert.equal(byName.people[0].person, "[[K1]]");
    assert.equal(byName.people[0].memberSinceYear, 2019);
    assert.equal(byName.people[0].dues.length, 1);
    const wire = JSON.stringify(byName);
    for (const secret of ["Zyxwsentinel", "Nurimfile", "secret@", id]) assert.equal(wire.includes(secret), false, secret);
    const byAlias = await memberProfileAiTool.run({ person: "[[K1]]" }, context as never) as { matches: number };
    assert.equal(byAlias.matches, 1);
    const unknown = await memberProfileAiTool.run({ person: "[[K99]]" }, context as never) as { matches: number };
    assert.equal(unknown.matches, 0);
  } finally {
    await db.memberDue.deleteMany({ where: { memberId: member.id } });
    await db.member.delete({ where: { id: member.id } });
  }
});
