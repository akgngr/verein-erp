import type { ReactNode } from "react";

import type { Role } from "../roles";

/**
 * Üst çubuk eylemleri sözleşmesi (RFC-002, #419). Modül `src/modules/<modül>/header.tsx` içinde
 * `export const header = defineModuleHeader({...})` ile tema düğmesinin yanına bir düğme ekler; `pnpm module:sync`
 * bunları src/header-registry.ts içinde toplar. Yerleşim (layout) modül import etmez; yalnız bu kayıt üzerinden okur.
 *
 * Kurallar: yalnız **kullanılabilir** modüllerin eylemleri çizilir (etkin + erişim onaylı + gerekiyorsa lisanslı).
 * `render` sunucuda çalışır; yetki denetimini kendisi yapar ve gösterilmeyecekse `null` döndürür.
 * İstemciye kişisel veri taşımaz; yalnız düğme ve gerekli bayraklar.
 */
export type HeaderContext = { user: { id: string; role: Role } };

export type HeaderAction = {
  key: string;
  /** Küçük sayı sola yakın; tema düğmesi her zaman en sağdadır. */
  order: number;
  render: (context: HeaderContext) => ReactNode | Promise<ReactNode>;
};

export type ModuleHeader = { module: string; actions: HeaderAction[] };

export function defineModuleHeader(header: ModuleHeader): ModuleHeader {
  return header;
}

/** Saf: kullanılabilir modüllerin eylemleri, sıraya göre. */
export function usableHeaderActions(registry: readonly ModuleHeader[], usableModuleKeys: readonly string[]): (HeaderAction & { module: string })[] {
  const usable = new Set(usableModuleKeys);
  return registry
    .filter((entry) => usable.has(entry.module))
    .flatMap((entry) => entry.actions.map((action) => ({ ...action, module: entry.module })))
    .sort((a, b) => a.order - b.order || a.module.localeCompare(b.module) || a.key.localeCompare(b.key));
}
