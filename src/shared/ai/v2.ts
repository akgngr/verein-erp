import { z } from "zod";
import type { ModuleAi, ModuleAiContext, ModuleAiTool, AiUser, AiOperation } from "./define";
import { DATA_POLICY, type PolicyTable } from "../data-policy";

export type AiDataPolicy = {
  purpose: string;
  serverReads: readonly PolicyTable[];
  /** Explicit allowlist, including nested fields expressed as dot paths. */
  modelFields: readonly string[];
  processing: "local_only" | "approved_provider";
  /**
   * Model-görünür çıktının sınıfı (docs/architecture/ai-cloud-pseudonym-relay.md). Bulutta denetimli
   * modda: aggregate/internal açılır; pseudonymous yalnız "takma adlı kişi verisi" ayarı açıksa.
   * Belirtilmezse araç denetimli modda bulutta kapalıdır.
   */
  modelDataClass?: "aggregate" | "internal" | "pseudonymous";
};
export type AiLimits = { maxOutputBytes: number; maxRows: number; timeoutMs: number };
export const DEFAULT_AI_LIMITS: AiLimits = Object.freeze({ maxOutputBytes: 65_536, maxRows: 100, timeoutMs: 30_000 });

function assertOutputShape(value: unknown, fields: readonly string[], maxRows: number, path = ""): void {
  if (Array.isArray(value)) {
    if (value.length > maxRows) throw new Error("AI_OUTPUT_ROW_LIMIT");
    for (const item of value) assertOutputShape(item, fields, maxRows, path);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const field = path ? `${path}.${key}` : key;
      if (!fields.some(allowed => allowed === field || allowed.startsWith(`${field}.`))) throw new Error("AI_OUTPUT_FIELD_DENIED");
      assertOutputShape(item, fields, maxRows, field);
    }
  }
}

export function aiToolV2<I extends z.ZodType, R extends z.ZodType, M extends z.ZodType>(definition: {
  name: string;
  operation: AiOperation;
  description: string;
  allowed: (user: AiUser) => boolean;
  input: I;
  result: R;
  modelOutput: M;
  policy: AiDataPolicy;
  limits?: Partial<AiLimits>;
  run: (input: z.output<I>, context: ModuleAiContext & { signal: AbortSignal }) => Promise<z.input<R>>;
  projectForModel: (result: z.output<R>, context: ModuleAiContext) => Promise<z.input<M>> | z.input<M>;
}): ModuleAiTool & { contractVersion: 2; policy: AiDataPolicy } {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(definition.name)) throw new Error("AI_TOOL_NAME_INVALID");
  if (!definition.policy.purpose.trim()) throw new Error("AI_TOOL_PURPOSE_REQUIRED");
  for (const table of definition.policy.serverReads) {
    // Authentication and secret data never become generic AI source adapters.
    if (!DATA_POLICY[table] || DATA_POLICY[table].category === "K0") throw new Error("AI_SOURCE_DENIED");
  }
  z.toJSONSchema(definition.input, { unrepresentable: "throw", io: "output",override:({zodSchema})=>{
    const def=zodSchema._zod.def;
    if("checks" in def && def.checks?.some(check=>check._zod.def.check==="custom"))throw new Error("AI_INPUT_REFINEMENT_UNREPRESENTABLE");
  } });
  const inputSchema = z.toJSONSchema(definition.input, { unrepresentable: "throw", io: "input" });
  const limits = { ...DEFAULT_AI_LIMITS, ...definition.limits };
  for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value <= 0) throw new Error("AI_LIMIT_INVALID");
  return {
    contractVersion: 2,
    name: definition.name, operation: definition.operation, description: definition.description,
    allowed: definition.allowed, schema: definition.input, inputSchema,
    policy: definition.policy,
    processing: definition.policy.processing === "local_only" ? "local_only" : undefined,
    async run(raw, context) {
      const input = definition.input.parse(raw);
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("AI_TOOL_TIMEOUT")); }, limits.timeoutMs);
      });
      try {
        const task = (async () => {
          const result = definition.result.parse(await definition.run(input, { ...context, signal: controller.signal, createDataset:async args=>{controller.signal.throwIfAborted();const result=await context.createDataset(args);controller.signal.throwIfAborted();return result;},loadDatasetDefinition:async token=>{controller.signal.throwIfAborted();return context.loadDatasetDefinition(token);}, propose:proposal=>{controller.signal.throwIfAborted();context.propose(proposal);}, attachFile:file=>{controller.signal.throwIfAborted();context.attachFile(file);} }));
          controller.signal.throwIfAborted();
          const output = definition.modelOutput.parse(await definition.projectForModel(result, context));
          controller.signal.throwIfAborted();
          assertOutputShape(output, definition.policy.modelFields, limits.maxRows);
          const json = JSON.stringify(output);
          if (json === undefined || Buffer.byteLength(json, "utf8") > limits.maxOutputBytes) throw new Error("AI_OUTPUT_BYTE_LIMIT");
          return output;
        })();
        return await Promise.race([task, timeout]);
      } finally { clearTimeout(timer); }
    },
  };
}

export function assertUniqueToolNames(tools: readonly { name: string }[]): void {
  const names = new Set<string>();
  for (const tool of tools) {
    if (names.has(tool.name)) throw new Error("AI_DUPLICATE_TOOL_NAME");
    names.add(tool.name);
  }
}

export function defineModuleAiV2(definition: Omit<ModuleAi, "tools"> & { tools: (ModuleAiTool & { contractVersion: 2 })[] }): ModuleAi {
  assertUniqueToolNames(definition.tools);
  return { ...definition, contractVersion: 2 };
}
