import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error -- plain ESM script without type declarations
import { evaluatePromotion } from "../../scripts/check-promotion.mjs";

const repo = "akgngr/verein-erp";
const ok = (input: Record<string, unknown>) => assert.deepEqual(evaluatePromotion({ headRepo: repo, baseRepo: repo, ...input }), []);
const bad = (input: Record<string, unknown>, pattern: RegExp) => {
  const errors: string[] = evaluatePromotion({ headRepo: repo, baseRepo: repo, ...input });
  assert.ok(errors.some((error) => pattern.test(error)), `${JSON.stringify(input)} → ${JSON.stringify(errors)}`);
};

test("promotion: only feature → alpha → beta → main", () => {
  ok({ base: "alpha", head: "claude/secretary-x" });
  ok({ base: "alpha", head: "chatgpt/ui-y" });
  ok({ base: "beta", head: "alpha" });
  ok({ base: "main", head: "beta" });
  bad({ base: "main", head: "alpha" }, /only beta -> main/);
  bad({ base: "main", head: "claude/x" }, /only beta -> main/);
  bad({ base: "beta", head: "claude/x" }, /only alpha -> beta/);
  bad({ base: "beta", head: "main" }, /only alpha -> beta/);
  bad({ base: "alpha", head: "main" }, /not allowed/);
  bad({ base: "alpha", head: "beta" }, /not allowed/);
  bad({ base: "alpha", head: "random-branch" }, /must start with/);
});

test("promotion: forks cannot target protected branches", () => {
  bad({ base: "alpha", head: "claude/x", headRepo: "someone/fork" }, /forks/);
  bad({ base: "main", head: "beta", headRepo: "someone/fork" }, /forks/);
});

test("promotion: base content missing from source blocks beta/main (no skipped promotion, no direct edits)", () => {
  bad({ base: "main", head: "beta", extraOnBase: ["src/app.ts"] }, /main has changes that beta does not contain/);
  bad({ base: "beta", head: "alpha", extraOnBase: ["a.ts"] }, /beta has changes that alpha does not contain/);
  ok({ base: "main", head: "beta", extraOnBase: [] });
});

test("promotion: stacked PRs into non-protected bases are not restricted", () => {
  ok({ base: "claude/base-branch", head: "claude/child" });
});
