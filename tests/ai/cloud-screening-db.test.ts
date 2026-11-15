import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { screenTurnsForCloud } from "@/modules/ai/services/cloud-screening";
import { CloudPreflightError } from "@/modules/ai/services/cloud-preflight-error";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("Use an isolated database");

test("denetimli mod: kayıtlı kişi takma ada çevrilir, kişisel veri gönderilmez, eski riskli mesaj bağlamdan çıkar", { skip: !enabled }, async () => {
  const db = getDb();
  const id = `screen-${randomUUID()}`;
  const conversationId = randomUUID();
  const member = await db.member.create({ data: { year: 2001, sequence: Math.floor(Math.random() * 1e8), membershipNumber: id, firstName: "Zeynepsentinel", lastName: "Karadağtest", joinDate: new Date("2001-01-01"), createdById: id, createdByLabel: "Test" } });
  const user = { id, name: "Actor", email: `${id}@example.test`, role: "ADMIN" as const, mustChangePassword: false };
  // Tarama DB'deki kayıtlı kişi listesiyle çalışır; test yalnız oluşturulan üyeyi verir.
  const known = async () => [{ key: `members:${member.id}`, label: "Zeynepsentinel Karadağtest", references: [id] }];
  try {
    const turns = await screenTurnsForCloud({
      user, provider: "mistral", conversationId,
      turns: [
        { role: "user", content: "Mail an max@beispiel.de" },
        { role: "assistant", content: "Bunu gönderemem." },
        { role: "user", content: "Zeynepsentinel Karadağtest aidatını ödedi mi?" },
      ],
    }, known);
    assert.equal(turns.length, 2);
    assert.equal(turns[0].role, "assistant");
    assert.match(turns[1].content, /^\[\[K\d+\]\] aidatını ödedi mi\?$/);
    assert.ok(!JSON.stringify(turns).includes("Zeynepsentinel") && !JSON.stringify(turns).includes("beispiel"));
    const again = await screenTurnsForCloud({ user, provider: "mistral", conversationId, turns: [{ role: "user", content: `${id} borçlu mu?` }] }, known);
    assert.equal(again[0].content, turns[1].content.replace(" aidatını ödedi mi?", " borçlu mu?"));
    await assert.rejects(
      screenTurnsForCloud({ user, provider: "mistral", conversationId, turns: [{ role: "user", content: "Zeynepsentinel Karadağtest hasta, telefonu 0171 2345678" }] }, known),
      (error: unknown) => error instanceof CloudPreflightError && error.kinds.includes("PHONE") && error.kinds.includes("SPECIAL_CATEGORY"),
    );
  } finally {
    await db.aiReferenceScope.deleteMany({ where: { userId: id } });
    await db.member.delete({ where: { id: member.id } });
  }
});
