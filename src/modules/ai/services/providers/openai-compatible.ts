import "server-only";

import OpenAI from "openai";

import { ProviderError, type ProviderAdapter, type ProviderRunArgs } from "./types";

/**
 * OpenAI Chat Completions biçimi: hem OpenAI hem de kendi sunucunuzdaki OpenAI uyumlu
 * uçlar (Ollama, vLLM, LM Studio …) için. İstemci, ayardaki baseURL/anahtar ile kurulur.
 */
export function openAiCompatibleAdapter(options: { apiKey: string; baseURL?: string }): ProviderAdapter {
  return {
    async run({ model, system, turns, tools, maxToolRounds, executeTool }: ProviderRunArgs) {
      const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: system },
        ...turns.map((turn) => ({ role: turn.role, content: turn.content }) as OpenAI.Chat.ChatCompletionMessageParam),
      ];
      const usage = { inputTokens: 0, outputTokens: 0 };
      try {
        for (let round = 0; ; round += 1) {
          const response = await client.chat.completions.create({
            model,
            messages,
            tools: tools.map((tool) => ({ type: "function" as const, function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })),
          });
          usage.inputTokens += response.usage?.prompt_tokens ?? 0;
          usage.outputTokens += response.usage?.completion_tokens ?? 0;
          const choice = response.choices[0];
          if (!choice) return { text: "", refused: false, ...usage };
          const message = choice.message;
          if (message.refusal) return { text: "", refused: true, ...usage };
          const calls = (message.tool_calls ?? []).filter((call) => call.type === "function");
          messages.push({ role: "assistant", content: message.content ?? "", tool_calls: message.tool_calls });
          if (calls.length === 0 || round >= maxToolRounds) return { text: (message.content ?? "").trim(), refused: false, ...usage };
          for (const call of calls) {
            let input: unknown = null;
            try {
              input = JSON.parse(call.function.arguments || "{}");
            } catch {
              input = null;
            }
            const outcome = await executeTool(call.function.name, input);
            messages.push({ role: "tool", tool_call_id: call.id, content: outcome.content });
          }
        }
      } catch (error) {
        if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) throw new ProviderError("auth");
        if (error instanceof OpenAI.RateLimitError) throw new ProviderError("rateLimit");
        if (error instanceof OpenAI.APIError || error instanceof OpenAI.APIConnectionError) throw new ProviderError("unavailable");
        throw error;
      }
    },
  };
}
