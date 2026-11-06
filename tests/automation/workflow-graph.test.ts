import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
  compileWorkflow,
  evaluateCondition,
  planWorkflow,
  resolveTemplates,
  validateWorkflow,
  type CanonicalGraph,
  type PlannerStepState,
  type WorkflowCatalog,
} from "@/shared/automation/workflow-graph";

const node = (id: string, type: string, properties: Record<string, unknown> = {}) => ({ id, data: { type, properties: { label: id, ...properties } } });
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });

const catalog: WorkflowCatalog = {
  tasks: new Map([
    ["automation.log_message", { inputSchema: z.object({ message: z.string().min(1) }).strict(), workflowEnabled: true }],
    ["mailings.send_campaign", { inputSchema: z.object({ campaignId: z.string() }), workflowEnabled: false }],
  ]),
  events: new Set(["members.created"]),
};

function compile(nodes: unknown[], edges: unknown[]): CanonicalGraph {
  const result = compileWorkflow({ nodes, edges });
  assert.deepEqual(result.issues, []);
  return result.graph!;
}

describe("Workflow compiler and validator", () => {
  test("compiles editor JSON into the canonical graph", () => {
    const graph = compile(
      [node("t", "trigger", { triggerType: "event", eventKey: "members.created" }), node("a", "task", { taskKey: "automation.log_message", input: '{"message":"hi"}' })],
      [edge("t", "a")],
    );
    assert.equal(graph.nodes[1].kind, "task");
    assert.deepEqual(validateWorkflow(graph, catalog), []);
  });

  test("rejects unknown node kinds (no code nodes)", () => {
    const result = compileWorkflow({ nodes: [node("t", "trigger"), node("x", "javascript", { code: "process.exit()" })], edges: [edge("t", "x")] });
    assert.ok(result.issues.includes("NODE_KIND_UNSUPPORTED:x"));
  });

  test("detects cycles, unreachable nodes, unknown events and non-workflow tasks", () => {
    const graph = compile(
      [
        node("t", "trigger", { triggerType: "event", eventKey: "nope.event" }),
        node("a", "parallel"), node("b", "parallel"),
        node("c", "task", { taskKey: "mailings.send_campaign", input: '{"campaignId":"x"}' }),
        node("z", "parallel"),
      ],
      [edge("t", "a"), edge("a", "b"), edge("b", "a"), edge("a", "c")],
    );
    const issues = validateWorkflow(graph, catalog);
    assert.ok(issues.includes("GRAPH_HAS_CYCLE"));
    assert.ok(issues.includes("NODE_UNREACHABLE:z"));
    assert.ok(issues.includes("TRIGGER_EVENT_UNKNOWN"));
    assert.ok(issues.includes("TASK_NOT_AVAILABLE:c"));
  });

  test("validates static task input against the task schema", () => {
    const graph = compile([node("t", "trigger"), node("a", "task", { taskKey: "automation.log_message", input: '{"message":""}' })], [edge("t", "a")]);
    assert.ok(validateWorkflow(graph, catalog).includes("TASK_INPUT_INVALID:a:message"));
    const referenced = compile([node("t", "trigger"), node("a", "task", { taskKey: "automation.log_message", input: '{"message":"{{trigger.text}}"}' })], [edge("t", "a")]);
    assert.deepEqual(validateWorkflow(referenced, catalog), []);
  });

  test("requires exactly one trigger and a valid delay", () => {
    const result = compileWorkflow({ nodes: [node("t", "trigger"), node("d", "delay", {})], edges: [edge("t", "d")] });
    assert.ok(result.issues.some((issue) => issue.startsWith("SCHEMA:")));
    const two = compile([node("t", "trigger"), node("u", "trigger")], []);
    assert.ok(validateWorkflow(two, catalog).includes("TRIGGER_COUNT_INVALID"));
  });
});

describe("Templates and conditions", () => {
  const context = { trigger: { status: "ACTIVE", count: "5" }, steps: { a: { sent: 3 } } };

  test("resolves whole-string references only and keeps types", () => {
    const resolved = resolveTemplates({ a: "{{steps.a.sent}}", b: "x {{trigger.status}}", c: "{{uuid}}" }, context, () => "U");
    assert.deepEqual(resolved, { a: 3, b: "x {{trigger.status}}", c: "U" });
  });

  test("compares numerically when both sides are numbers", () => {
    assert.equal(evaluateCondition({ field: "trigger.count", operator: "gt", value: "10" }, context), false);
    assert.equal(evaluateCondition({ field: "trigger.count", operator: "gte", value: "5" }, context), true);
    assert.equal(evaluateCondition({ field: "trigger.status", operator: "eq", value: "ACTIVE" }, context), true);
    assert.equal(evaluateCondition({ field: "trigger.missing", operator: "exists", value: "" }, context), false);
  });
});

describe("Planner (dead-path elimination)", () => {
  const graph = compile(
    [
      node("t", "trigger"),
      node("yes", "condition", { field: "trigger.ok", operator: "eq", value: "1" }),
      node("no", "condition", { field: "trigger.ok", operator: "neq", value: "1" }),
      node("a", "task", { taskKey: "automation.log_message", input: '{"message":"yes"}' }),
      node("b", "approval"),
      node("join", "parallel"),
    ],
    [edge("t", "yes"), edge("t", "no"), edge("yes", "a"), edge("no", "b"), edge("a", "join"), edge("b", "join")],
  );

  function run(trigger: unknown) {
    const states = new Map<string, PlannerStepState>();
    const log: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const actions = planWorkflow(graph, states, { trigger, steps: {} }, new Date());
      if (!actions.length) break;
      for (const action of actions) {
        log.push(`${action.type}:${action.nodeId}`);
        if (action.type === "complete") states.set(action.nodeId, { status: "SUCCEEDED", passed: action.passed });
        else if (action.type === "skip") states.set(action.nodeId, { status: "SKIPPED" });
        else if (action.type === "startTask") states.set(action.nodeId, { status: "SUCCEEDED", passed: true });
        else states.set(action.nodeId, { status: "WAITING" });
      }
    }
    return log;
  }

  test("true branch runs the task and skips the approval branch", () => {
    const log = run({ ok: 1 });
    assert.ok(log.includes("startTask:a"));
    assert.ok(log.includes("skip:b"));
    assert.ok(log.includes("complete:join"));
  });

  test("false branch waits for approval and join waits too", () => {
    const log = run({ ok: 2 });
    assert.ok(log.includes("skip:a"));
    assert.ok(log.includes("wait:b"));
    assert.ok(!log.some((entry) => entry.endsWith(":join")));
  });
});

describe("Per-task palette nodes", () => {
  test("task.<key> nodes use form fields as input and convert delay units", () => {
    const result = compileWorkflow({
      nodes: [
        node("t", "trigger", { triggerType: "manual", eventKey: "members.created" }),
        node("a", "task.automation.log_message", { message: "{{trigger.memberId}}", description: "" }),
        node("d", "delay", { mode: "duration", amount: 2, unit: "days" }),
      ],
      edges: [edge("t", "a"), edge("a", "d")],
    });
    assert.deepEqual(result.issues, []);
    const [trigger, task, delay] = result.graph!.nodes;
    assert.deepEqual(trigger.config, { triggerType: "manual" });
    assert.deepEqual(task.config, { taskKey: "automation.log_message", input: { message: "{{trigger.memberId}}" } });
    assert.deepEqual(delay.config, { minutes: 2880 });
    assert.deepEqual(validateWorkflow(result.graph!, catalog), []);
  });
});

describe("Draft vs published comparison", () => {
  test("stableStringify ignores key order (jsonb reorders keys)", async () => {
    const { stableStringify } = await import("@/shared/automation/workflow-graph");
    assert.equal(stableStringify({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } }), stableStringify({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }));
  });
});
