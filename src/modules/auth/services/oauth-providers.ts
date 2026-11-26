import "server-only";

import type { Provider } from "next-auth/providers";

import { loadAuthProviders, selectAuthProviders } from "@/shared/auth/providers";

/**
 * #612: İstek anında etkin dış giriş sağlayıcıları. Kaynak yalnızca `module:sync` ile üretilen kayıttır
 * (src/auth-provider-registry.ts); auth modülü hiçbir sağlayıcıyı adıyla bilmez.
 *
 * - Modülü kapalı / onaysız / lisanssız olan sağlayıcı yüklenmez (modül kapısı).
 * - Geçersiz, ayrılmış veya çakışan kimlikler reddedilir; yükleme hatası veya zaman aşımı sağlayıcıyı atlar.
 * - Herhangi bir hata parola girişini etkilemez: liste boş döner.
 * Loglara yalnız modül anahtarı, sağlayıcı kimliği ve neden yazılır (sır veya token asla).
 */
export async function loadEnabledAuthProviders(): Promise<{ providers: Provider[]; ids: string[] }> {
  try {
    const [{ moduleAuthProviderRegistry }, { listUsableModuleKeys }] = await Promise.all([
      import("@/auth-provider-registry"),
      import("@/modules/system/automation"),
    ]);
    if (moduleAuthProviderRegistry.length === 0) return { providers: [], ids: [] };
    const usable = new Set(await listUsableModuleKeys());
    const { selected, rejected } = selectAuthProviders(moduleAuthProviderRegistry, usable);
    for (const item of rejected) {
      if (item.reason !== "module_unavailable") console.warn("[auth] provider rejected", { module: item.moduleKey, id: item.id, reason: item.reason });
    }
    const { loaded, skipped } = await loadAuthProviders(selected);
    for (const item of skipped) {
      if (item.reason !== "not_configured") console.warn("[auth] provider skipped", { module: item.moduleKey, id: item.id, reason: item.reason });
    }
    return { providers: loaded.map((entry) => entry.provider), ids: loaded.map((entry) => entry.id) };
  } catch {
    console.warn("[auth] provider registry unavailable; password sign-in only");
    return { providers: [], ids: [] };
  }
}
