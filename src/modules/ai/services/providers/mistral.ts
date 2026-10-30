import "server-only";

import { Mistral } from "@mistralai/mistralai";
import type { ChatCompletionRequestMessage as Messages } from "@mistralai/mistralai/models/components";

import { ProviderError, type ProviderAdapter } from "./types";

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((chunk) => (chunk && typeof chunk === "object" && "text" in chunk ? String((chunk as { text: unknown }).text) : "")).join("")
      : "";

/** Mistral (Fransa, AB içinde işleme) — resmi SDK, function calling. */
export function mistralAdapter(apiKey: string): ProviderAdapter {
  return {
    async run({ model, system, turns, tools, maxToolRounds, executeTool }) {
      const client = new Mistral({ apiKey });
      const messages: Messages[] = [{ role: "system", content: system }, ...turns.map((turn) => ({ role: turn.role, content: turn.content }) as Messages)];
      const usage = { inputTokens: 0, outputTokens: 0 };
      try {
        for (let round = 0; ; round += 1) {
          const response = await client.chat.complete({
            model,
            messages,
            tools: tools.map((tool) => ({ type: "function" as const, function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })),
          });
          usage.inputTokens += response.usage?.promptTokens ?? 0;
          usage.outputTokens += response.usage?.completionTokens ?? 0;
          const message = response.choices?.[0]?.message;
          if (!message) return { text: "", refused: false, ...usage };
          const calls = message.toolCalls ?? [];
          messages.push({ role: "assistant", content: message.content ?? "", toolCalls: message.toolCalls ?? undefined });
          if (calls.length === 0 || round >= maxToolRounds) return { text: textOf(message.content).trim(), refused: false, ...usage };
          for (const call of calls) {
            let input: unknown = call.function.arguments;
            if (typeof input === "string") {
              try {
                input = JSON.parse(input || "{}");
              } catch {
                input = null;
              }
            }
            const outcome = await executeTool(call.function.name, input);
            messages.push({ role: "tool", content: outcome.content, toolCallId: call.id ?? null, name: call.function.name });
          }
        }
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 401 || status === 403) throw new ProviderError("auth");
        if (status === 429) throw new ProviderError("rateLimit");
        if (status !== undefined || (error as Error).name?.includes("Connection")) throw new ProviderError("unavailable");
        throw error;
      }
    },
  };
}
