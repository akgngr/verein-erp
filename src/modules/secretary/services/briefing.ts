import "server-only";

import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import {
  SECRETARY_LIMITS,
  validateBriefingItem,
  type Briefing,
  type BriefingItem,
  type ModuleSecretary,
  type SecretaryContext,
} from "@/shared/secretary/define";

type ItemState = { itemId: string; state: "DISMISSED" | "SNOOZED"; until: Date | null };

/** Test için bağımlılıklar (varsayılan: gerçek kayıt, modül onayı, çeviri ve veritabanı). */
export type BriefingDeps = {
  registry?: readonly ModuleSecretary[];
  usableModules?: () => Promise<string[]>;
  translator?: (moduleKey: string) => Promise<SecretaryContext["t"]>;
  itemStates?: (userId: string) => Promise<ItemState[]>;
  timeoutMs?: number;
};

const SEVERITY_ORDER: Record<BriefingItem["severity"], number> = { danger: 0, warning: 1, info: 2 };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SECRETARY_PROVIDER_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Görünürlük: kapatılmış öğe hiç, ertelenmiş öğe süresi dolana kadar gösterilmez. */
export function isHidden(itemId: string, states: readonly ItemState[], now: Date): boolean {
  const state = states.find((entry) => entry.itemId === itemId);
  if (!state) return false;
  if (state.state === "DISMISSED") return true;
  return state.until !== null && state.until.getTime() > now.getTime();
}

export function sortItems(items: BriefingItem[]): BriefingItem[] {
  return [...items].sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")
    || a.id.localeCompare(b.id));
}

/**
 * T1.1 — kullanıcının sabah özeti. Sağlayıcılar yalnız modül kullanılabilir (etkin + erişim onaylı) ve
 * kullanıcının sağlayıcıdaki yetkisi varsa çağrılır; paralel, zaman aşımlı ve birbirinden yalıtılmış çalışır.
 * Hata veren veya geçersiz öğe döndüren sağlayıcı yalnız `failures` listesine düşer; içerik loglanmaz.
 */
export async function getBriefing(user: { id: string; role: Role }, now = new Date(), deps: BriefingDeps = {}): Promise<Briefing> {
  const registry = deps.registry ?? (await import("@/secretary-registry")).moduleSecretaryRegistry;
  const [usable, states] = await Promise.all([
    (deps.usableModules ?? defaultUsableModules)().then((keys) => new Set(keys)),
    (deps.itemStates ?? defaultItemStates)(user.id),
  ]);
  const translator = deps.translator ?? defaultTranslator;
  const timeoutMs = deps.timeoutMs ?? SECRETARY_LIMITS.providerTimeoutMs;
  const failures: string[] = [];

  const jobs = registry
    .filter((entry) => usable.has(entry.module))
    .flatMap((entry) => entry.providers
      .filter((provider) => can(user.role, provider.permission.definition, provider.permission.action))
      .map(async (provider) => {
        const id = `${entry.module}.${provider.key}`;
        try {
          const t = await translator(entry.module);
          const items = await withTimeout(provider.collect({ user, now, t }), timeoutMs);
          const valid = items.filter((item) => validateBriefingItem(entry.module, item).length === 0);
          if (valid.length !== items.length) failures.push(id);
          return { module: entry.module, items: valid.slice(0, SECRETARY_LIMITS.maxItemsPerProvider) };
        } catch {
          failures.push(id);
          console.error("[secretary] PROVIDER_FAILED", { provider: id });
          return { module: entry.module, items: [] as BriefingItem[] };
        }
      }));

  const results = await Promise.all(jobs);
  const byModule = new Map<string, BriefingItem[]>();
  for (const result of results) {
    const visible = result.items.filter((item) => !isHidden(item.id, states, now));
    byModule.set(result.module, [...(byModule.get(result.module) ?? []), ...visible]);
  }
  const sections = [...byModule.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([module, items]) => ({ module, items: sortItems(items) }))
    .sort((a, b) => SEVERITY_ORDER[a.items[0].severity] - SEVERITY_ORDER[b.items[0].severity] || a.module.localeCompare(b.module));

  return { generatedAt: now.toISOString(), sections, failures: [...new Set(failures)].sort() };
}

// Varsayılan bağımlılıklar gerektiğinde yüklenir (birim testleri Next/DB zincirini yüklemez).
async function defaultUsableModules(): Promise<string[]> {
  return (await import("@/modules/system/server")).listUsableModuleKeys();
}

async function defaultItemStates(userId: string): Promise<ItemState[]> {
  const { getDb } = await import("@/shared/db");
  return getDb().secretaryItemState.findMany({ where: { userId }, select: { itemId: true, state: true, until: true } });
}

async function defaultTranslator(moduleKey: string): Promise<SecretaryContext["t"]> {
  const t = await (await import("next-intl/server")).getTranslations(moduleKey);
  return (key, values) => t(key as never, values as never);
}
