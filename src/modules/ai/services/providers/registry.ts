/**
 * İzinli yapay zekâ sağlayıcıları (KVKK/DSGVO). KARAR: liste koda gömülüdür; yalnızca
 * veri işleme sözleşmesi (AVV/DPA) yapılabilen sağlayıcılar ve dernek sunucusundaki yerel
 * model vardır. Yeterlilik kararı olmayan ülkelerdeki bulut API'leri (ör. DeepSeek, GLM)
 * bilinçli olarak YOKTUR; bu modeller ancak "local" ile kendi sunucunuzda çalıştırılabilir.
 */
export const AI_PROVIDER_IDS = ["local", "mistral", "anthropic", "openai"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type ProviderSettings = { id: AiProviderId; model: string | null; apiKey: string | null; baseURL: string | null };

/** Model alanı boş bırakılırsa kullanılan varsayılan (OpenAI ve yerel modelde model zorunludur). */
export const DEFAULT_MODELS: Partial<Record<AiProviderId, string>> = {
  anthropic: "claude-opus-5-5",
  mistral: "mistral-large-latest",
};

export { isPrivateEndpoint } from "./secure-endpoint";
import { isPrivateEndpoint } from "./secure-endpoint";

/** Sağlayıcı kullanıma hazır mı (anahtar + model; yerelde özel ağ adresi, anahtar isteğe bağlı). */
export function isReady(settings: ProviderSettings): boolean {
  if (!settings.model) return false;
  if (settings.id === "local") return Boolean(settings.baseURL && isPrivateEndpoint(settings.baseURL));
  return Boolean(settings.apiKey);
}
