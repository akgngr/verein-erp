import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import { moduleAutomationEvents } from "@/automation-registry";
import { taskModuleKey } from "@/shared/automation/define";

/**
 * Module standard for automation events (src/modules/<module>/automation.ts):
 * every event is translated, carries no personal data in its payload and is
 * actually emitted by its module.
 */
const PII_FIELD = /(name|email|mail|phone|tel|address|street|city|zip|postal|birth|iban|bic|tax|passport|kimlik|note|comment|description)/i;

function messages(moduleKey: string, locale: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join("src/modules", moduleKey, "messages", `${locale}.json`), "utf8"));
}

function get(obj: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function moduleSources(moduleKey: string): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && entry.name !== "automation.ts") out.push(fs.readFileSync(full, "utf8"));
    }
  };
  walk(path.join("src/modules", moduleKey));
  return out.join("\n");
}

describe("Module automation events standard", () => {
  test("registry has events from several modules", () => {
    assert.ok(moduleAutomationEvents.length >= 5);
  });

  for (const event of moduleAutomationEvents) {
    const moduleKey = taskModuleKey(event.key);
    const name = event.key.slice(moduleKey.length + 1);
    const shape = event.payloadSchema instanceof z.ZodObject ? event.payloadSchema.shape as Record<string, z.ZodType> : {};

    test(`${event.key}: payload is an object with identifiers/classifications only`, () => {
      assert.ok(event.payloadSchema instanceof z.ZodObject, "payloadSchema must be z.object(...).strict()");
      const pii = Object.keys(shape).filter((field) => PII_FIELD.test(field));
      assert.deepEqual(pii, [], `personal data in payload; expose it via variables.load instead: ${pii.join(", ")}`);
    });

    for (const locale of ["tr", "de"]) {
      test(`${event.key}: ${locale} label, field labels and option labels exist`, () => {
        const base = `automation.events.${name}`;
        const msgs = messages(moduleKey, locale);
        assert.equal(typeof get(msgs, `${base}.label`), "string", `${moduleKey}/messages/${locale}.json → ${base}.label`);
        const json = z.toJSONSchema(event.payloadSchema) as { properties?: Record<string, { enum?: unknown[] }> };
        for (const [field, prop] of Object.entries(json.properties ?? {})) {
          assert.equal(typeof get(msgs, `${base}.fields.${field}`), "string", `${base}.fields.${field}`);
          for (const value of prop.enum ?? []) {
            assert.equal(typeof get(msgs, `${base}.options.${field}.${String(value)}`), "string", `${base}.options.${field}.${String(value)}`);
          }
        }
        for (const field of event.variables?.fields ?? []) {
          assert.equal(typeof get(msgs, `${base}.variables.${field}`), "string", `${base}.variables.${field}`);
        }
      });
    }

    test(`${event.key}: is emitted by its module`, () => {
      const automationFile = fs.readFileSync(path.join("src/modules", moduleKey, "automation.ts"), "utf8");
      const exportName = new RegExp(`export const (\\w+) = defineEvent\\(\\{\\s*key: "${event.key.replace(".", "\\.")}"`).exec(automationFile)?.[1];
      assert.ok(exportName, "event must be exported from automation.ts");
      assert.match(moduleSources(moduleKey), new RegExp(`emitAutomationEvent\\(\\s*${exportName}\\b`), `call emitAutomationEvent(${exportName}, …) where the record is created`);
    });
  }
});
