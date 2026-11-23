import "server-only";

import { recordEgress } from "@/shared/egress/record-egress";

import { createLocalFetch } from "./secure-fetch";
import { anthropicAdapter } from "./anthropic";
import { mistralAdapter } from "./mistral";
import { openAiCompatibleAdapter } from "./openai-compatible";
import type { ProviderSettings } from "./registry";
import type { ProviderAdapter } from "./types";

/** Ayarlardan (veritabanı) kurulan bağlayıcı; anahtar istemciye hiç çıkmaz. */
export function adapterFor(settings: ProviderSettings): ProviderAdapter {
  let inner: ProviderAdapter;
  switch (settings.id) {
    case "anthropic":
      inner = anthropicAdapter(settings.apiKey ?? "");
      break;
    case "mistral":
      inner = mistralAdapter(settings.apiKey ?? "");
      break;
    case "openai":
      inner = openAiCompatibleAdapter({ apiKey: settings.apiKey ?? "" });
      break;
    case "local":
      inner = openAiCompatibleAdapter({
        apiKey: settings.apiKey || "local",
        baseURL: settings.baseURL ?? undefined,
        fetch: createLocalFetch(settings.baseURL ?? ""),
      });
      break;
  }

  return {
    async run(args) {
      let bytesSent = 0;
      let totalTokens = 0;
      try {
        const result = await inner.run({
          ...args,
          beforeRequest: async (bytes = 0) => {
            bytesSent += bytes;
            await args.beforeRequest(bytes);
          },
        });
        totalTokens = (result.inputTokens ?? 0) + (result.outputTokens ?? 0);
        return result;
      } finally {
        if (bytesSent > 0 || totalTokens > 0) {
          await recordEgress({
            moduleKey: "ai",
            category: "AI_INFERENCE",
            provider: settings.id,
            volume: totalTokens > 0 ? totalTokens : bytesSent,
            count: 1,
            unit: totalTokens > 0 ? "tokens" : "bytes",
            legalBasis: settings.id === "local" ? "LEGITIMATE_INTEREST" : "CONSENT",
          });
        }
      }
    },
  };
}

export { getProviderSettings, isProviderReady, listProviderStatus, saveProviderCredential } from "./credentials";
export { AI_PROVIDER_IDS, isPrivateEndpoint, type AiProviderId, type ProviderSettings } from "./registry";
export { ProviderError } from "./types";
