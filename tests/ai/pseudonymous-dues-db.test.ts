import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { aliasFor, resolveAliasesForDisplay } from "@/modules/ai/services/aliases";
import { openAiCompatibleAdapter } from "@/modules/ai/services/providers/openai-compatible";
import { makePseudonymousDuesTool } from "@/modules/members/services/dues-ai-tool";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("Use an isolated database");

test("takma adlı aidat listesi: sağlayıcıya ad gitmez, rapor gösterimde gerçek adla çözülür", { skip: !enabled }, async () => {
  const db = getDb();
  const id = `pseudo-${randomUUID()}`;
  const actor = { userId: id, conversationId: randomUUID(), policyRevision: "rev" };
  const memberIds: string[] = [];
  try {
    for (const [index, amount] of [120, 45].entries()) {
      const member = await db.member.create({ data: { year: 2097, sequence: Math.floor(Math.random() * 1e8), membershipNumber: `${id}-${index}`, firstName: `Privatsentinel${index}`, lastName: "Nurimfile", joinDate: new Date("2097-01-01"), createdById: id, createdByLabel: "Test", dues: { create: { year: 2097, amountDue: amount, dueDate: new Date("2097-02-15"), createdById: id, createdByLabel: "Test" } } } });
      memberIds.push(member.id);
    }
    const tool = makePseudonymousDuesTool({ name: "list_dues_by_person" });
    const wire: string[] = [];
    let modelReply = "";
    const adapter = openAiCompatibleAdapter({
      apiKey: "test-not-a-real-key",
      fetch: async (_url, init) => {
        wire.push(String(init?.body));
        const toolResult = wire.length === 2 ? (JSON.parse(String(init?.body)).messages.at(-1).content as string) : "";
        const top = toolResult ? (JSON.parse(toolResult).rows[0].person as string) : "";
        modelReply = `En yüksek borç: ${top}`;
        const message = wire.length === 1
          ? { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: tool.name, arguments: JSON.stringify({ year: 2097, status: "ALL" }) } }] }
          : { role: "assistant", content: modelReply };
        return new Response(JSON.stringify({ id: "t", object: "chat.completion", created: 0, model: "test", choices: [{ index: 0, finish_reason: wire.length === 1 ? "tool_calls" : "stop", message }] }), { headers: { "content-type": "application/json" } });
      },
    });
    const user = { id, name: "Actor", email: `${id}@example.test`, role: "ADMIN" as const };
    const result = await adapter.run({
      model: "test", system: "test", turns: [{ role: "user", content: "2097 aidat borçlularını sırala" }],
      tools: [{ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }], maxToolRounds: 6, beforeRequest: async () => {},
      executeTool: async (_name, input) => {
        const output = await tool.run(input, { user, pseudonym: (resource, recordId) => aliasFor(actor, resource, recordId), restore: (v) => v, loadDatasetDefinition: async () => null, createDataset: async () => "", propose: () => {}, attachFile: () => {} });
        return { content: JSON.stringify(output), isError: false };
      },
    });
    const all = wire.join("\n");
    assert.ok(!all.includes("Privatsentinel") && !all.includes("Nurimfile") && !all.includes(id), "provider wire must not contain names or member numbers");
    assert.match(all, /\[\[K\d+\]\]/);
    const output = JSON.parse(JSON.parse(wire[1]).messages.at(-1).content);
    const mine = output.rows.filter((row: { person: string }) => /^\[\[K\d+\]\]$/.test(row.person));
    assert.ok(mine.length >= 2);
    assert.ok(output.rows.every((row: { remainingEur: number; dueMonth: string }) => Number.isInteger(row.remainingEur) && /^\d{4}-\d{2}$/.test(row.dueMonth)));
    const [display] = await resolveAliasesForDisplay({ id, role: "ADMIN" }, actor.conversationId, [result.text], { hidden: "HIDDEN", unknown: "UNKNOWN" });
    assert.match(display, /En yüksek borç: \[(Privatsentinel\d Nurimfile|[^\]]+)\]\(\/uyeler\//);
    const [teacher] = await resolveAliasesForDisplay({ id, role: "TEACHER" }, actor.conversationId, [result.text], { hidden: "HIDDEN", unknown: "UNKNOWN" });
    assert.equal(teacher, "En yüksek borç: HIDDEN");
  } finally {
    await db.aiReferenceScope.deleteMany({ where: { userId: id } });
    await db.memberDue.deleteMany({ where: { memberId: { in: memberIds } } });
    await db.member.deleteMany({ where: { id: { in: memberIds } } });
  }
});
