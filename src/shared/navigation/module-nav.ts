/**
 * Sol panel menüsünün saf (UI'dan bağımsız) mantığı: hangi modülün içinde olunduğu,
 * modül menüsünün hangi öğelerden oluştuğu ve hangi öğenin aktif olduğu.
 *
 * Kabuk hiçbir modülü tanımaz; tüm bilgi ModuleConfig.nav ve ModuleConfig.menu'den gelir.
 */
import type { ModuleConfig, ModuleMenuItem, NavItem } from "../types/module";

/** Modülün ana sayfası için modül menüsüne otomatik eklenen öğenin anahtarı. */
export const MODULE_HOME_KEY = "_home";

type Href = { path: string; query: URLSearchParams };

function parseHref(href: string): Href {
  const [path, query = ""] = href.split("?");
  return { path: path.length > 1 ? path.replace(/\/+$/, "") : path, query: new URLSearchParams(query) };
}

/**
 * Bağlantının mevcut adrese ne kadar özgül eşleştiği; eşleşmiyorsa -1.
 * Yol eşit ya da alt yol olmalı, bağlantıdaki her sorgu parametresi mevcut adreste aynı olmalı.
 * Daha uzun yol ve daha çok sorgu parametresi daha özgüldür (en özgül öğe aktif sayılır).
 */
export function matchScore(href: string, pathname: string, searchParams?: URLSearchParams): number {
  const target = parseHref(href);
  const isRoot = target.path === "/";
  const pathMatches = isRoot
    ? pathname === "/"
    : pathname === target.path || pathname.startsWith(`${target.path}/`);
  if (!pathMatches) return -1;

  let queryCount = 0;
  for (const [key, value] of target.query) {
    if (searchParams?.get(key) !== value) return -1;
    queryCount++;
  }
  return target.path.length * 100 + queryCount;
}

/** Modülün ana sayfası: nav'daki ilk öğe. */
export function moduleHome(mod: ModuleConfig): NavItem | undefined {
  return mod.nav[0];
}

/**
 * Modülün menüsü (ana sayfa dahil). Menü tanımı ana sayfa bağlantısını içermiyorsa
 * "Genel bakış" öğesi başa eklenir; içeriyorsa (örn. E-posta: "/mail" = Ayarlar) o öğe kullanılır.
 */
export function moduleMenuItems(mod: ModuleConfig): ModuleMenuItem[] {
  const home = moduleHome(mod);
  const items = mod.menu ?? [];
  if (!home || items.length === 0) return items;
  if (items.some((item) => !item.isDownload && item.href === home.href)) return items;
  return [
    {
      key: MODULE_HOME_KEY,
      label: "Genel bakış",
      href: home.href,
      icon: home.icon,
      permission: home.permission,
    },
    ...items,
  ];
}

/** Sol panelde modül görünümüne geçilen (alt menüsü olan) modül mü? */
export function hasModuleMenu(mod: ModuleConfig): boolean {
  return (mod.menu?.length ?? 0) > 0;
}

/** Mevcut adresin ait olduğu modül: nav ve menü bağlantıları arasında en özgül eşleşen. */
export function findActiveModule(
  modules: ModuleConfig[],
  pathname: string,
  searchParams?: URLSearchParams,
): ModuleConfig | undefined {
  let best: { mod: ModuleConfig; score: number } | undefined;
  for (const mod of modules) {
    const hrefs = [
      ...mod.nav.map((item) => item.href),
      ...(mod.menu ?? []).filter((item) => !item.isDownload).map((item) => item.href),
    ];
    for (const href of hrefs) {
      const score = matchScore(href, pathname, searchParams);
      if (score >= 0 && (!best || score > best.score)) best = { mod, score };
    }
  }
  return best?.mod;
}

/** Listedeki aktif öğenin anahtarı (en özgül eşleşen); indirme bağlantıları hiç aktif olmaz. */
export function findActiveKey<T extends { href: string; isDownload?: boolean }>(
  items: T[],
  keyOf: (item: T) => string,
  pathname: string,
  searchParams?: URLSearchParams,
): string | undefined {
  let best: { key: string; score: number } | undefined;
  for (const item of items) {
    if (item.isDownload) continue;
    const score = matchScore(item.href, pathname, searchParams);
    if (score >= 0 && (!best || score > best.score)) best = { key: keyOf(item), score };
  }
  return best?.key;
}
