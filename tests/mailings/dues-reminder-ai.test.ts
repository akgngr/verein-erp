import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { AI_TOOL_POLICY } from "@/shared/data-policy";

const read = (file: string) => fs.readFileSync(file, "utf8");

// #410 F03 — dues reminder draft → separate send approval → existing mailings automation.
describe("AI dues reminder draft (#410 F03)", () => {
  const source = read("src/modules/mailings/ai.ts");

  test("the model only gets an acknowledgement; no recipients, amounts or filters", () => {
    assert.deepEqual(AI_TOOL_POLICY.propose_dues_reminder_draft, { module: "mailings", reads: [], serverReads: [], modelFields: ["status", "note"] });
  });

  test("the audience is fixed on the server and cannot come from the model", () => {
    assert.match(source, /DUES_REMINDER_SOURCE = "members:members"/);
    assert.match(source, /DUES_REMINDER_FILTER = \{ status: \["ACTIVE"\], dues: \["OPEN"\] \} as const/);
    const schema = source.match(/const duesReminderSchema = z\.object\(\{([\s\S]*?)\}\)\.strict\(\);/)?.[1] ?? "";
    assert.ok(schema.length > 0);
    assert.doesNotMatch(schema, /sourceId|filter|scheduledAt|tracking/, "the model cannot choose audience, schedule or tracking");
    assert.match(source, /saveCampaignDraftAction\(\{ \.\.\.input, sourceId: DUES_REMINDER_SOURCE, filter: \{ status: \[\.\.\.DUES_REMINDER_FILTER\.status\], dues: \[\.\.\.DUES_REMINDER_FILTER\.dues\] \} \}\)/);
  });

  test("confirmation only saves a draft; sending stays a separate step in the wizard", () => {
    const tool = source.slice(source.indexOf('name: "propose_dues_reminder_draft"'), source.indexOf("actions: {"));
    assert.match(tool, /propose\(\{ action: "dues_reminder_draft"/);
    assert.doesNotMatch(source, /launchCampaignAction/, "the assistant never launches a campaign");
  });

  test("members recipients skip bulk-mail opt-outs and support the open-dues filter", () => {
    const recipients = read("src/modules/members/recipients.ts");
    assert.match(recipients, /const DUES = \["OPEN", "NONE"\]/);
    assert.match(recipients, /optOut: row\.bulkMailOptOut/);
  });

  test("the confirmation card has TR/DE texts", () => {
    for (const lang of ["tr", "de"]) {
      const messages = JSON.parse(read(`src/modules/mailings/messages/${lang}.json`)) as { ai: Record<string, Record<string, string>> };
      for (const key of ["kind", "confirm", "done"]) assert.ok(messages.ai.dues_reminder_draft?.[key], `${lang} ai.dues_reminder_draft.${key}`);
    }
  });
});
