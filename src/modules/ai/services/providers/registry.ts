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

/**
 * "Yerel" uç gerçekten dernek ağında mı: loopback, özel IP blokları, .local/.internal/.lan
 * ya da tek parçalı ad (Docker servis adı, ör. "ollama"). Değilse yerel sağlayıcı reddedilir —
 * böylece "local" üzerinden dışarıdaki bir bulut API'sine veri gönderilemez.
 */
export function isPrivateEndpoint(baseURL: string): boolean {
  let host: string;
  try {
    host = new URL(baseURL).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (host === "localhost" || host === "::1" || host === "host.docker.internal") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = /^172\.(\d+)\./.exec(host);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true; // IPv6 ULA
  if (/\.(local|internal|lan|home\.arpa)$/.test(host)) return true;
  return !host.includes(".") && !host.includes(":") && /^[a-z0-9-]+$/.test(host);
}

/** Sağlayıcı kullanıma hazır mı (anahtar + model; yerelde özel ağ adresi, anahtar isteğe bağlı). */
export function isReady(settings: ProviderSettings): boolean {
  if (!settings.model) return false;
  if (settings.id === "local") return Boolean(settings.baseURL && isPrivateEndpoint(settings.baseURL));
  return Boolean(settings.apiKey);
}
