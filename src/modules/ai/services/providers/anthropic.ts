import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { ProviderError, type ProviderAdapter } from "./types";

/** Claude (Anthropic Messages API; anahtar ayarlardan) — reddedilen isteklerde sunucu tarafı yedek model açık. */
export function anthropicAdapter(apiKey: string): ProviderAdapter {
  return {
    async run({ model, system, turns, tools, maxToolRounds, executeTool }) {
      const client = new Anthropic({ apiKey });
      const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((turn) => ({
        role: turn.role,
        content: turn.content,
      }));
      const usage = { inputTokens: 0, outputTokens: 0 };
      try {
        for (let round = 0; ; round += 1) {
          const response = await client.beta.messages.create({
            model,
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: "low" },
            system,
            tools: tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
              strict: true,
            })),
            messages,
          });
          usage.inputTokens += response.usage.input_tokens;
          usage.outputTokens += response.usage.output_tokens;
          if (response.stop_reason === "refusal")
            return { text: "", refused: true, ...usage };

          messages.push({ role: "assistant", content: response.content });
          const toolUses = response.content.filter(
            (block): block is Anthropic.Beta.BetaToolUseBlock =>
              block.type === "tool_use",
          );
          if (
            response.stop_reason !== "tool_use" ||
            toolUses.length === 0 ||
            round >= maxToolRounds
          ) {
            const text = response.content
              .filter(
                (block): block is Anthropic.Beta.BetaTextBlock =>
                  block.type === "text",
              )
              .map((block) => block.text)
              .join("\n")
              .trim();
            return { text, refused: false, ...usage };
          }
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const block of toolUses) {
            const outcome = await executeTool(block.name, block.input);
            results.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: outcome.content,
              is_error: outcome.isError,
            });
          }
          messages.push({ role: "user", content: results });
        }
      } catch (error) {
        if (
          error instanceof Anthropic.AuthenticationError ||
          error instanceof Anthropic.PermissionDeniedError
        )
          throw new ProviderError("auth");
        if (error instanceof Anthropic.RateLimitError)
          throw new ProviderError("rateLimit");
        if (error instanceof Anthropic.APIError)
          throw new ProviderError("unavailable");
        throw error;
      }
    },
  };
}
