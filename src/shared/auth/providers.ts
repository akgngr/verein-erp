import type { Provider } from "next-auth/providers";

/**
 * Kimlik sağlayıcı sözleşmesi (#612, sıfır dokunuş): bir modül `src/modules/<modül>/auth-providers.ts` içinde
 * `export const authProviders = defineAuthProviders({ ... })` bildirir; `pnpm module:sync` bunu yalnız sunucuda
 * kullanılan src/auth-provider-registry.ts içinde toplar. Auth modülü hiçbir sağlayıcıyı adıyla import etmez.
 *
 * KARAR: Sağlayıcı istek anında (`load`) kurulur; böylece yönetici bir sağlayıcıyı açıp kapattığında veya kimlik
 * bilgilerini değiştirdiğinde yeniden derleme gerekmez. Yapılandırılmamış, kapalı veya hata veren sağlayıcı
 * `null` döner / atlanır ("fail closed"); parola girişi her durumda çalışmaya devam eder.
 */
export type AuthProviderDefinition = {
  /** Benzersiz, kalıcı kimlik (Auth.js provider id, geri dönüş adresi /api/auth/callback/<id>). */
  id: string;
  /** Çeviri bulunamazsa gösterilen ad (örn. "Google"). */
  label: string;
  /**
   * İstek anında Auth.js sağlayıcı yapılandırmasını kurar. Döndürülen sağlayıcının `id` değeri yukarıdaki `id`
   * ile aynı olmalıdır. Kimlik bilgisi yoksa veya sağlayıcı kapalıysa `null` döndürür.
   * Sırlar yalnızca burada okunur; asla loglanmaz.
   */
  load: () => Promise<Provider | null> | Provider | null;
};

export type ModuleAuthProviders = {
  moduleKey: string;
  providers: AuthProviderDefinition[];
};

export function defineAuthProviders(config: ModuleAuthProviders): ModuleAuthProviders {
  return config;
}

/** Çekirdeğin kendi sağlayıcıları ve Auth.js'in ayrılmış adları: modüller kullanamaz. */
export const RESERVED_PROVIDER_IDS: ReadonlySet<string> = new Set(["credentials", "email", "nodemailer", "webauthn", "passkey"]);
/** URL'de (callback yolu) güvenli, küçük harf kimlik. */
export const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;
/** Bir sağlayıcının yüklenmesi bu süreyi aşarsa atlanır (dış servis kesintisi girişi kilitlemez). */
export const PROVIDER_LOAD_TIMEOUT_MS = 3000;

export type ProviderRejection = { moduleKey: string; id: string; reason: "invalid_id" | "reserved_id" | "duplicate_id" | "module_unavailable" };

export type SelectedProvider = { moduleKey: string; definition: AuthProviderDefinition };

/**
 * Saf seçim: kullanılabilir modüllerin geçerli, benzersiz kimlikli sağlayıcıları; sıra modül anahtarı, sonra kimlik.
 * KARAR: Aynı kimliği iki modül bildirirse İKİSİ de reddedilir (hangisinin kazanacağı sırayla belirlenmez;
 * yanlış sağlayıcıya oturum açtırma riski yerine kapalı kalır).
 */
export function selectAuthProviders(
  entries: readonly ModuleAuthProviders[],
  usableModuleKeys: ReadonlySet<string>,
): { selected: SelectedProvider[]; rejected: ProviderRejection[] } {
  const rejected: ProviderRejection[] = [];
  const candidates: SelectedProvider[] = [];
  const sorted = [...entries].sort((a, b) => (a.moduleKey < b.moduleKey ? -1 : a.moduleKey > b.moduleKey ? 1 : 0));
  for (const entry of sorted) {
    for (const definition of entry.providers) {
      const id = definition.id;
      if (!PROVIDER_ID_PATTERN.test(id)) rejected.push({ moduleKey: entry.moduleKey, id, reason: "invalid_id" });
      else if (RESERVED_PROVIDER_IDS.has(id)) rejected.push({ moduleKey: entry.moduleKey, id, reason: "reserved_id" });
      else if (!usableModuleKeys.has(entry.moduleKey)) rejected.push({ moduleKey: entry.moduleKey, id, reason: "module_unavailable" });
      else candidates.push({ moduleKey: entry.moduleKey, definition });
    }
  }
  const counts = new Map<string, number>();
  for (const candidate of candidates) counts.set(candidate.definition.id, (counts.get(candidate.definition.id) ?? 0) + 1);
  const selected: SelectedProvider[] = [];
  for (const candidate of candidates) {
    if ((counts.get(candidate.definition.id) ?? 0) > 1) {
      rejected.push({ moduleKey: candidate.moduleKey, id: candidate.definition.id, reason: "duplicate_id" });
    } else {
      selected.push(candidate);
    }
  }
  selected.sort((a, b) => (a.definition.id < b.definition.id ? -1 : a.definition.id > b.definition.id ? 1 : 0));
  return { selected, rejected };
}

function withTimeout<T>(value: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("provider_load_timeout")), ms);
    value.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export type LoadedProvider = { moduleKey: string; id: string; provider: Provider };

/** Provider nesnesinden (fonksiyon veya yapılandırma) kimliği okur; okunamazsa null. */
function providerId(provider: Provider): string | null {
  const config = (typeof provider === "function" ? provider() : provider) as { id?: unknown };
  return typeof config?.id === "string" ? config.id : null;
}

/**
 * Seçilen sağlayıcıları yükler. Hata veren, süresi aşan, null dönen veya kimliği bildirilenle uyuşmayan sağlayıcı
 * atlanır; nedeni (sır içermeyen) `skipped` listesinde döner.
 */
export async function loadAuthProviders(
  selected: readonly SelectedProvider[],
  timeoutMs = PROVIDER_LOAD_TIMEOUT_MS,
): Promise<{ loaded: LoadedProvider[]; skipped: { moduleKey: string; id: string; reason: "unavailable" | "not_configured" | "id_mismatch" }[] }> {
  const loaded: LoadedProvider[] = [];
  const skipped: { moduleKey: string; id: string; reason: "unavailable" | "not_configured" | "id_mismatch" }[] = [];
  for (const { moduleKey, definition } of selected) {
    let provider: Provider | null;
    try {
      provider = await withTimeout(Promise.resolve().then(() => definition.load()), timeoutMs);
    } catch {
      skipped.push({ moduleKey, id: definition.id, reason: "unavailable" });
      continue;
    }
    if (!provider) {
      skipped.push({ moduleKey, id: definition.id, reason: "not_configured" });
      continue;
    }
    let actualId: string | null;
    try {
      actualId = providerId(provider);
    } catch {
      actualId = null;
    }
    if (actualId !== definition.id) {
      skipped.push({ moduleKey, id: definition.id, reason: "id_mismatch" });
      continue;
    }
    loaded.push({ moduleKey, id: definition.id, provider });
  }
  return { loaded, skipped };
}
