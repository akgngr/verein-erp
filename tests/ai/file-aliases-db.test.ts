import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { aliasFor, resolveAliasesForDisplay } from "@/modules/ai/services/aliases";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("Use an isolated database");

test("dosya içeriği: [[Kn]] düz gerçek ada çevrilir (bağlantısız); yetkisiz kullanıcıda gizli kalır", { skip: !enabled }, async () => {
  const db = getDb();
  const id = `file-alias-${randomUUID()}`;
  const actor = { userId: id, conversationId: randomUUID(), policyRevision: "rev" };
  const member = await db.member.create({ data: { year: 2095, sequence: Math.floor(Math.random() * 1e8), membershipNumber: id, firstName: "Filesentinel", lastName: "Plainname", joinDate: new Date("2095-01-01"), createdById: id, createdByLabel: "Test" } });
  try {
    const alias = await aliasFor(actor, "members", member.id);
    const markdown = `| Üye | Borç |\n|---|---|\n| ${alias} | 60 € |`;
    const [plain] = await resolveAliasesForDisplay({ id, role: "ADMIN" }, actor.conversationId, [markdown], { hidden: "HIDDEN", unknown: "UNKNOWN" }, { plain: true });
    assert.match(plain, /\| Filesentinel Plainname \| 60 € \|/);
    assert.doesNotMatch(plain, /\]\(|\[\[K/);
    const [teacher] = await resolveAliasesForDisplay({ id, role: "TEACHER" }, actor.conversationId, [markdown], { hidden: "HIDDEN", unknown: "UNKNOWN" }, { plain: true });
    assert.doesNotMatch(teacher, /Filesentinel/);
  } finally {
    await db.aiReferenceScope.deleteMany({ where: { userId: id } });
    await db.member.delete({ where: { id: member.id } });
  }
});
