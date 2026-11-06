import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { AI_TOOL_POLICY, DATA_POLICY, GLOBAL_SENSITIVE_FIELD, type PolicyTable, type TablePolicy } from "@/shared/data-policy";

/**
 * Veri hassasiyeti politikasının kod tabanında uygulandığını denetler.
 * Belge: docs/veri-hassasiyeti.md · Kaynak: src/shared/data-policy.ts
 */
const policy = DATA_POLICY as Record<string, TablePolicy>;
const tools = AI_TOOL_POLICY as Record<string, { module: string; reads: readonly PolicyTable[] }>;

type Model = { name: string; owner: string; fields: Set<string> };

function readModels(): Model[] {
  const models: Model[] = [];
  for (const moduleKey of fs.readdirSync("src/modules")) {
    const file = path.join("src/modules", moduleKey, "schema.prisma");
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
      models.push({ name: match[1], owner: moduleKey, fields: new Set([...match[2].matchAll(/^\s+(\w+)\s+\S/gm)].map((m) => m[1])) });
    }
  }
  return models;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** "src/modules/<m>/…" → m; "src/shared/…" → "shared"; anything else → null (generated bridges, app shell). */
function areaOf(file: string): string | null {
  const parts = file.split(path.sep);
  if (parts[1] === "modules") return parts[2];
  if (parts[1] === "shared") return "shared";
  return null;
}

const accessor = (model: string) => model[0].toLowerCase() + model.slice(1);
const PRISMA_CALL = (model: string) => new RegExp(`(?:\\bdb|\\btx|getDb\\(\\)|\\bprisma|\\bclient)\\s*\\.\\s*${accessor(model)}\\s*\\.`);

/** Remove comments and string literals so descriptions do not count as field access. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

const models = readModels();
const modelByName = new Map(models.map((model) => [model.name, model]));

describe("Data policy: classification", () => {
  test("every Prisma model is classified (unclassified = treat as K0 and add it)", () => {
    const missing = models.filter((model) => !policy[model.name]).map((model) => `${model.owner}.${model.name}`);
    assert.deepEqual(missing, [], "add these tables to src/shared/data-policy.ts");
  });

  test("no stale entries and owners match the defining module", () => {
    for (const [name, entry] of Object.entries(policy)) {
      const model = modelByName.get(name);
      assert.ok(model, `${name} is not a Prisma model anymore`);
      assert.equal(entry.owner, model.owner, `${name} is defined in ${model.owner}`);
    }
  });

  test("sensitive fields exist on their tables", () => {
    for (const [name, entry] of Object.entries(policy)) {
      for (const field of entry.sensitiveFields) {
        assert.ok(modelByName.get(name)?.fields.has(field), `${name}.${field} does not exist`);
      }
    }
  });
});

describe("Data policy: module boundaries", () => {
  test("tables are accessed directly only by their owner or listed directAccess areas", () => {
    const violations: string[] = [];
    const files = sourceFiles("src").filter((file) => areaOf(file) !== null);
    const sources = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
    for (const [name, entry] of Object.entries(policy)) {
      const pattern = PRISMA_CALL(name);
      for (const [file, source] of sources) {
        const area = areaOf(file)!;
        if (area === entry.owner || entry.directAccess?.includes(area)) continue;
        if (pattern.test(source)) violations.push(`${file} → ${name} (owner ${entry.owner}, ${entry.category})`);
      }
    }
    assert.deepEqual(violations, [], "use the owner's public API or add a justified directAccess entry");
  });
});

describe("Data policy: AI tools", () => {
  const aiFiles = sourceFiles("src/modules").filter((file) => file.endsWith(`${path.sep}ai.ts`));

  test("every AI tool is declared in AI_TOOL_POLICY with its module", () => {
    const found = new Map<string, string>();
    for (const file of aiFiles) {
      for (const match of fs.readFileSync(file, "utf8").matchAll(/\bname:\s*"([a-z_]+)"/g)) found.set(match[1], areaOf(file)!);
    }
    for (const [tool, moduleKey] of found) {
      assert.ok(tools[tool], `AI tool ${tool} (${moduleKey}) is not declared in AI_TOOL_POLICY`);
      assert.equal(tools[tool].module, moduleKey, `${tool} belongs to ${moduleKey}`);
    }
    for (const tool of Object.keys(tools)) assert.ok(found.has(tool), `AI_TOOL_POLICY.${tool} no longer exists`);
  });

  test("AI tools read only K2/K3 tables", () => {
    for (const [tool, entry] of Object.entries(tools)) {
      for (const table of entry.reads) {
        const category = policy[table]?.category;
        assert.ok(category === "K2" || category === "K3", `${tool} reads ${table} (${category}); AI may only read K2/K3`);
      }
    }
  });

  test("ai.ts files query only declared K2/K3 tables and never return sensitive fields", () => {
    for (const file of aiFiles) {
      const moduleKey = areaOf(file)!;
      const code = codeOnly(fs.readFileSync(file, "utf8"));
      const declared = new Set(Object.values(tools).filter((entry) => entry.module === moduleKey).flatMap((entry) => entry.reads as readonly string[]));

      for (const [name, entry] of Object.entries(policy)) {
        if (!PRISMA_CALL(name).test(code)) continue;
        assert.ok(entry.category === "K2" || entry.category === "K3", `${file} queries ${name} (${entry.category})`);
        assert.ok(declared.has(name), `${file} queries ${name} but no ${moduleKey} tool declares it in AI_TOOL_POLICY`);
      }

      // Fields of the tables this module's tools read, plus K0/K1 fields of the module's own tables.
      const sensitive = new Set<string>();
      for (const [name, entry] of Object.entries(policy)) {
        if (declared.has(name) || (entry.owner === moduleKey && (entry.category === "K0" || entry.category === "K1"))) {
          entry.sensitiveFields.forEach((field) => sensitive.add(field));
        }
      }
      const used = [...code.matchAll(/\.\s*([A-Za-z_]\w*)\b/g)].map((match) => match[1]);
      const leaked = [...new Set(used.filter((field) => sensitive.has(field) || GLOBAL_SENSITIVE_FIELD.test(field)))];
      assert.deepEqual(leaked, [], `${file} accesses sensitive fields`);
    }
  });

  test("every tool result passes the pseudonymisation layer before reaching the model", () => {
    const assistant = fs.readFileSync("src/modules/ai/services/assistant.ts", "utf8");
    assert.match(assistant, /vault\.redactValue\(outcome\.value\)/, "tool outputs must be redacted (PseudonymVault)");
    assert.match(assistant, /vault\.redact\(turn\.content\)/, "user messages must be redacted");
  });
});
