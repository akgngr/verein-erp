import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

import * as define from "@/shared/ai/define";
import { AI_TOOL_POLICY, DATA_POLICY } from "@/shared/data-policy";
import type { ModuleAiContext } from "@/shared/ai/define";

process.env.AUTH_SECRET ??= "test-v2-only-registry-key";
process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
const globals = globalThis as unknown as { prisma?: PrismaClient };

// #410 F02: the v1 tool contract is gone; every registered tool must be v2 with a registered data policy.
describe("AI v2-only registry (#410 F02)", () => {
  test("the v1 helpers are no longer exported", () => {
    assert.equal("aiTool" in define, false);
    assert.equal("defineModuleAi" in define, false);
  });

  test("no module defines a v1 tool and the runtime rejects non-v2 tools", () => {
    const files = fs.readdirSync("src/modules", { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name));
    const offenders = files.filter((file) => /\baiTool\(|\bdefineModuleAi\(/.test(fs.readFileSync(file, "utf8")));
    assert.deepEqual(offenders, []);
    const runtime = fs.readFileSync("src/modules/ai/services/tools.ts", "utf8");
    assert.match(runtime, /tool\.contractVersion!==2\)throw new Error\("AI_V1_TOOL_REJECTED"\)/);
    assert.doesNotMatch(runtime, /\?2:1/);
    for (const file of files.filter((item) => item.endsWith(path.join("", "ai.ts")) && path.basename(item) === "ai.ts")) {
      assert.match(fs.readFileSync(file, "utf8"), /export const ai = defineModuleAiV2\(/, file);
    }
  });

  test("every tool name used with aiToolV2 is registered in AI_TOOL_POLICY", () => {
    const files = fs.readdirSync("src/modules", { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.ts$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name));
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      if (!text.includes("aiToolV2(")) continue;
      for (const match of text.matchAll(/aiToolV2\(\{\s*name:\s*"([a-z0-9_]+)"/g)) {
        assert.ok(match[1] in AI_TOOL_POLICY, `${file}: ${match[1]} missing in AI_TOOL_POLICY`);
      }
    }
  });
});

// #410 F01: minors' data (Student = K3) reaches the model only as counts.
describe("Child-data policy for students/guardians (#410 F01)", () => {
  const COUNT_FIELDS = new Set(["active", "inactive", "guardians", "withSepaMandate"]);

  test("every tool that reads Student or StudentGuardian exposes count fields only", () => {
    assert.equal(DATA_POLICY.Student.category, "K3");
    const readers = Object.entries(AI_TOOL_POLICY).filter(([, policy]) => "serverReads" in policy && (policy.serverReads as readonly string[]).some((table) => table === "Student" || table === "StudentGuardian"));
    assert.ok(readers.length > 0);
    for (const [name, policy] of readers) {
      for (const field of (policy as { modelFields: readonly string[] }).modelFields) assert.ok(COUNT_FIELDS.has(field), `${name} exposes ${field}`);
    }
  });

  test("get_student_statistics is local-only and only issues count queries", async () => {
    const { ai } = await import("@/modules/students/ai");
    const tool = ai.tools.find((item) => item.name === "get_student_statistics");
    assert.ok(tool);
    assert.equal(tool.processing, "local_only");
    const calls: string[] = [];
    const deny = (name: string) => async () => { throw new Error(`unexpected ${name}: minors' records must not be read`); };
    const previous = globals.prisma;
    globals.prisma = {
      student: { count: async () => { calls.push("student.count"); return 3; }, findMany: deny("student.findMany"), findFirst: deny("student.findFirst"), findUnique: deny("student.findUnique") },
      studentGuardian: { count: async () => { calls.push("studentGuardian.count"); return 2; }, findMany: deny("studentGuardian.findMany"), findFirst: deny("studentGuardian.findFirst") },
    } as unknown as PrismaClient;
    try {
      const context = { user: { id: "actor", name: "Actor", email: "actor@example.test", role: "ADMIN" }, propose: () => { throw new Error("no proposals"); } } as unknown as ModuleAiContext;
      const output = await tool.run({}, context);
      assert.deepEqual(output, { active: 3, inactive: 3, guardians: 2, withSepaMandate: 2 });
      assert.ok(calls.every((call) => call.endsWith(".count")));
    } finally {
      globals.prisma = previous;
    }
  });
});
