import "server-only";

import { anthropicAdapter } from "./anthropic";
import { mistralAdapter } from "./mistral";
import { openAiCompatibleAdapter } from "./openai-compatible";
import type { ProviderSettings } from "./registry";
import type { ProviderAdapter } from "./types";

/** Ayarlardan (veritabanı) kurulan bağlayıcı; anahtar istemciye hiç çıkmaz. */
export function adapterFor(settings: ProviderSettings): ProviderAdapter {
  switch (settings.id) {
    case "anthropic":
      return anthropicAdapter(settings.apiKey ?? "");
    case "mistral":
      return mistralAdapter(settings.apiKey ?? "");
    case "openai":
      return openAiCompatibleAdapter({ apiKey: settings.apiKey ?? "" });
    case "local":
      return openAiCompatibleAdapter({ apiKey: settings.apiKey || "local", baseURL: settings.baseURL ?? undefined });
  }
}

export { getProviderSettings, isProviderReady, listProviderStatus, saveProviderCredential } from "./credentials";
export { AI_PROVIDER_IDS, isPrivateEndpoint, type AiProviderId, type ProviderSettings } from "./registry";
export { ProviderError } from "./types";
