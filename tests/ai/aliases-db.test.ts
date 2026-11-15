import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { aliasFor, resolveAliasRecord, resolveAliasesForDisplay } from "@/modules/ai/services/aliases";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");
const labels = { hidden: "HIDDEN", unknown: "UNKNOWN" };

test("takma adlar konuşma içi sıralı, tutarlı ve kişiden bağımsızdır", { skip: !enabled }, async () => {
  const actor = { userId: `test-${randomUUID()}`, conversationId: randomUUID(), policyRevision: "rev" };
  const other = { ...actor, conversationId: randomUUID() };
  try {
    const first = await aliasFor(actor, "members", "member-a");
    const again = await aliasFor(actor, "members", "member-a");
    const second = await aliasFor(actor, "members", "member-b");
    assert.equal(first, "[[K1]]");
    assert.equal(again, first);
    assert.equal(second, "[[K2]]");
    assert.equal(await aliasFor(other, "members", "member-b"), "[[K1]]");
    const parallel = await Promise.all(["x", "y", "z"].map((id) => aliasFor(actor, "students", id)));
    assert.equal(new Set(parallel).size, 3);
  } finally {
    await getDb().aiReferenceScope.deleteMany({ where: { userId: actor.userId } });
  }
});

test("takma ad yalnız aynı kullanıcı, konuşma, kaynak ve politika sürümünde çözülür", { skip: !enabled }, async () => {
  const actor = { userId: `test-${randomUUID()}`, conversationId: randomUUID(), policyRevision: "rev" };
  try {
    const alias = await aliasFor(actor, "members", "member-a");
    assert.equal(await resolveAliasRecord(actor, alias, "members"), "member-a");
    await assert.rejects(resolveAliasRecord({ ...actor, userId: "other" }, alias, "members"));
    await assert.rejects(resolveAliasRecord({ ...actor, conversationId: "other" }, alias, "members"));
    await assert.rejects(resolveAliasRecord(actor, alias, "students"));
    await assert.rejects(resolveAliasRecord({ ...actor, policyRevision: "changed" }, alias, "members"));
    await assert.rejects(resolveAliasRecord(actor, "[[K99]]", "members"));
  } finally {
    await getDb().aiReferenceScope.deleteMany({ where: { userId: actor.userId } });
  }
});

test("gösterim: başka kullanıcı veya silinmiş kayıt için ad çözülmez", { skip: !enabled }, async () => {
  const actor = { userId: `test-${randomUUID()}`, conversationId: randomUUID(), policyRevision: "rev" };
  try {
    await aliasFor(actor, "members", `missing-${randomUUID()}`);
    const [own] = await resolveAliasesForDisplay({ id: actor.userId, role: "ADMIN" }, actor.conversationId, ["Borçlu: [[K1]] ve [[K9]]"], labels);
    assert.equal(own, "Borçlu: HIDDEN ve UNKNOWN");
    const [foreign] = await resolveAliasesForDisplay({ id: "someone-else", role: "ADMIN" }, actor.conversationId, ["[[K1]]"], labels);
    assert.equal(foreign, "UNKNOWN");
    const [plain] = await resolveAliasesForDisplay({ id: actor.userId, role: "ADMIN" }, actor.conversationId, ["takma ad yok"], labels);
    assert.equal(plain, "takma ad yok");
  } finally {
    await getDb().aiReferenceScope.deleteMany({ where: { userId: actor.userId } });
  }
});
