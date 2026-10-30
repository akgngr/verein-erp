/**
 * İzinli yapay zekâ sağlayıcıları (KVKK/DSGVO). KARAR: liste koda gömülüdür; yalnızca
 * veri işleme sözleşmesi (AVV/DPA) yapılabilen sağlayıcılar ve dernek sunucusundaki yerel
 * model vardır. Yeterlilik kararı olmayan ülkelerdeki bulut API'leri (ör. DeepSeek, GLM)
 * bilinçli olarak YOKTUR; bu modeller ancak "local" ile kendi sunucunuzda çalıştırılabilir.
 */
export const AI_PROVIDER_IDS = ["local", "mistral", "anthropic", "openai"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type ProviderSettings = { id: AiProviderId; model: string | null; apiKey: string | null; baseURL: string | null };

const env = (name: string) => process.env[name]?.trim() || null;

/** Ortam değişkenlerinden sağlayıcı ayarı (anahtar değeri asla istemciye gönderilmez). */
export function providerSettings(id: AiProviderId): ProviderSettings {
  switch (id) {
    case "anthropic":
      return { id, model: env("AI_ANTHROPIC_MODEL") ?? "claude-opus-5-5", apiKey: env("ANTHROPIC_API_KEY"), baseURL: null };
    case "mistral":
      return { id, model: env("AI_MISTRAL_MODEL") ?? "mistral-large-latest", apiKey: env("MISTRAL_API_KEY"), baseURL: null };
    case "openai":
      // Model adı açıkça seçilmelidir (sürüm adları sık değişir).
      return { id, model: env("AI_OPENAI_MODEL"), apiKey: env("OPENAI_API_KEY"), baseURL: null };
    case "local":
      return { id, model: env("AI_LOCAL_MODEL"), apiKey: env("AI_LOCAL_API_KEY") ?? "local", baseURL: env("AI_LOCAL_BASE_URL") };
  }
}

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

/** Sağlayıcı kullanıma hazır mı (anahtar + model; yerelde özel ağ adresi). */
export function isProviderReady(id: AiProviderId): boolean {
  const settings = providerSettings(id);
  if (!settings.model) return false;
  if (id === "local") return Boolean(settings.baseURL && isPrivateEndpoint(settings.baseURL));
  return Boolean(settings.apiKey);
}
