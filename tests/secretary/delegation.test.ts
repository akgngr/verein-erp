/**
 * S5.2 (#316) — vekil modu: açık yetki, kapsam, süre sonu, geri alma, denetim; kimliğe bürünme ve yetki aşımı yok,
 * vekil sahibin onayını kullanamaz.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { delegationInputSchema } from "@/modules/secretary/services/delegation";
import { getDb } from "@/shared/db";
import type { Role } from "@/shared/roles";
import type { Briefing } from "@/shared/secretary/define";

test("delegation: girdi şeması kapsamı sınırlar ve tekilleştirir", () => {
  const parsed = delegationInputSchema.parse({ delegateId: "u2", scopes: ["briefing.view", "briefing.view"], expiresAt: "2031-04-01T00:00:00Z" });
  assert.deepEqual(parsed.scopes, ["briefing.view"]);
  assert.equal(delegationInputSchema.safeParse({ delegateId: "u2", scopes: ["proposals.approve"], expiresAt: "2031-04-01T00:00:00Z" }).success, false, "onay devredilemez");
  assert.equal(delegationInputSchema.safeParse({ delegateId: "u2", scopes: [], expiresAt: "2031-04-01T00:00:00Z" }).success, false);
  assert.equal(delegationInputSchema.safeParse({ delegateId: "u2", scopes: ["briefing.view"], expiresAt: "2031-04-01T00:00:00Z", grantorId: "x" }).success, false);
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: yetki, süre, geri alma; vekil kendi rolüyle süzülmüş, önerisiz görünüm alır", { skip: !enabled }, async () => {
  const db = getDb();
  const svc = await import("@/modules/secretary/services/delegation");
  const tag = `dg-${randomUUID().slice(0, 8)}`;
  const mk = (role: Role) => db.user.create({ data: { name: `${tag}-${role}`, email: `${randomUUID()}@${tag}.example.test`, passwordHash: "x", role, isActive: true } });
  const grantor = await mk("ADMIN");
  const delegate = await mk("TEACHER");
  const viewer = await mk("VIEWER");
  const other = await mk("BOARD");
  const users = new Map([grantor, delegate, viewer, other].map((u) => [u.id, { id: u.id, name: u.name, role: u.role as Role, isActive: true }]));
  const loadUser = async (id: string) => users.get(id) ?? null;
  const now = new Date("2031-03-27T08:00:00Z");
  const expiresAt = new Date("2031-04-10T08:00:00Z");
  const seen: { id: string; role: Role }[] = [];
  const buildBriefing = async (user: { id: string; role: Role }): Promise<Briefing> => {
    seen.push(user);
    return { generatedAt: "x", failures: [], sections: [{ module: "tasks", items: [{ id: "tasks:overdue", module: "tasks", kind: "overdue", severity: "danger", title: "t", count: 2, href: "/tasks", proposalId: "prop-1", suggestion: { action: "x", payload: { secret: true } } }] }] };
  };
  try {
    await assert.rejects(() => svc.createDelegation(grantor, { delegateId: grantor.id, scopes: ["briefing.view"], expiresAt }, now, loadUser), /self/);
    await assert.rejects(() => svc.createDelegation(grantor, { delegateId: viewer.id, scopes: ["briefing.view"], expiresAt }, now, loadUser), /delegateInvalid/, "sekreteri kullanamayan vekil olamaz");
    await assert.rejects(() => svc.createDelegation(grantor, { delegateId: delegate.id, scopes: ["briefing.view"], expiresAt: new Date("2031-07-01T00:00:00Z") }, now, loadUser), /expiry/, "en fazla 90 gün");
    await assert.rejects(() => svc.createDelegation({ id: viewer.id, role: "VIEWER" }, { delegateId: delegate.id, scopes: ["briefing.view"], expiresAt }, now, loadUser), /forbidden/);

    const grant = await svc.createDelegation(grantor, { delegateId: delegate.id, scopes: ["briefing.view"], expiresAt }, now, loadUser);
    await assert.rejects(() => svc.createDelegation(grantor, { delegateId: delegate.id, scopes: ["briefing.view"], expiresAt }, now, loadUser), /duplicate/);

    // Başka bir kullanıcı bu yetkiyi kullanamaz.
    await assert.rejects(() => svc.getDelegatedBriefing({ id: other.id, role: "BOARD" }, grant.id, { loadUser, buildBriefing }, now), /notFound/);

    // Vekil: sahibin kimliği + VEKİLİN rolü; öneri kimliği/yükü çıkarılmış.
    const view = await svc.getDelegatedBriefing({ id: delegate.id, role: "TEACHER" }, grant.id, { loadUser, buildBriefing }, now);
    assert.deepEqual(seen.at(-1), { id: grantor.id, role: "TEACHER" }, "yetki aşımı yok: vekilin rolü");
    const item = view.briefing.sections[0].items[0];
    assert.equal("proposalId" in item, false);
    assert.equal("suggestion" in item, false);

    // Sahibi pasifleşirse görünüm kapanır.
    users.set(grantor.id, { ...users.get(grantor.id)!, isActive: false });
    await assert.rejects(() => svc.getDelegatedBriefing({ id: delegate.id, role: "TEACHER" }, grant.id, { loadUser, buildBriefing }, now), /notFound/);
    users.set(grantor.id, { ...users.get(grantor.id)!, isActive: true });

    // Süre sonu.
    await assert.rejects(() => svc.getDelegatedBriefing({ id: delegate.id, role: "TEACHER" }, grant.id, { loadUser, buildBriefing }, new Date("2031-04-11T00:00:00Z")), /notFound/);

    // Geri alma: üçüncü kişi geri alamaz; vekil geri alabilir; sonra görünüm yok.
    await assert.rejects(() => svc.revokeDelegation(other.id, grant.id, now), /notFound/);
    await svc.revokeDelegation(delegate.id, grant.id, now);
    await assert.rejects(() => svc.getDelegatedBriefing({ id: delegate.id, role: "TEACHER" }, grant.id, { loadUser, buildBriefing }, now), /notFound/);
    assert.deepEqual((await svc.listDelegations(grantor.id, now, loadUser)).map((row) => row.id), [], "geri alınan listede yok");

    // Vekil, sahibin önerisini onaylayamaz: öneri kararı öneri sahibine bağlıdır (kullanıcı kimliğiyle süzülür).
    const proposal = await db.secretaryProposal.create({ data: { userId: grantor.id, moduleKey: "tasks", actionKey: "x", payloadEnc: "x", previewEnc: "x", payloadHash: "x", idempotencyKey: `${tag}-p`, expiresAt } });
    const { getMyProposalState } = await import("@/modules/secretary/services/pending-proposals");
    assert.deepEqual(await getMyProposalState({ id: delegate.id }, proposal.id, now), await getMyProposalState({ id: delegate.id }, "does-not-exist", now), "vekil için öneri yok sayılır");
    assert.notDeepEqual(await getMyProposalState({ id: grantor.id }, proposal.id, now), await getMyProposalState({ id: delegate.id }, proposal.id, now));
  } finally {
    await db.secretaryProposal.deleteMany({ where: { idempotencyKey: `${tag}-p` } });
    await db.secretaryDelegation.deleteMany({ where: { grantorId: grantor.id } });
    await db.user.deleteMany({ where: { id: { in: [grantor.id, delegate.id, viewer.id, other.id] } } });
  }
});
