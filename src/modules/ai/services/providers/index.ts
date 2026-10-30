import "server-only";

import { anthropicAdapter } from "./anthropic";
import { mistralAdapter } from "./mistral";
import { openAiCompatibleAdapter } from "./openai-compatible";
import { providerSettings, type AiProviderId } from "./registry";
import type { ProviderAdapter } from "./types";

export function adapterFor(id: AiProviderId): ProviderAdapter {
  const settings = providerSettings(id);
  switch (id) {
    case "anthropic":
      return anthropicAdapter;
    case "mistral":
      return mistralAdapter(settings.apiKey ?? "");
    case "openai":
      return openAiCompatibleAdapter({ apiKey: settings.apiKey ?? "" });
    case "local":
      return openAiCompatibleAdapter({ apiKey: settings.apiKey ?? "local", baseURL: settings.baseURL ?? undefined });
  }
}

export { AI_PROVIDER_IDS, isPrivateEndpoint, isProviderReady, providerSettings, type AiProviderId } from "./registry";
export { ProviderError } from "./types";
