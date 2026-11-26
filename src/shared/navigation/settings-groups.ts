import type { SettingsGroupId } from "@/shared/types/module";

/**
 * Ayar merkezi grupları ve sırası (#611). Kabuk hiçbir modülü tanımaz: her ayar sayfası kendi modül
 * tanımında `settingsGroup` / `settingsOrder` bildirir. Bildirmeyen (eski) modüller güvenli varsayılana düşer.
 * Saf modül: hem sunucu (ayar merkezi) hem istemci (sol panel alt menüsü) kullanır.
 */
export const SETTINGS_GROUPS: readonly SettingsGroupId[] = [
  "general",
  "users-access",
  "security-privacy",
  "integrations",
  "appearance",
  "communication",
  "ai-automation",
  "module-management",
  "system-management",
] as const;

/** `group: "settings"` sayfaları için varsayılan grup. */
export const DEFAULT_SETTINGS_PAGE_GROUP: SettingsGroupId = "general";
/** Modülün kendi ayar sayfası (menü `key: "settings"`) için varsayılan grup. */
export const DEFAULT_MODULE_SETTINGS_GROUP: SettingsGroupId = "module-management";

const GROUP_INDEX = new Map(SETTINGS_GROUPS.map((id, index) => [id, index]));

export function isSettingsGroupId(value: unknown): value is SettingsGroupId {
  return typeof value === "string" && GROUP_INDEX.has(value as SettingsGroupId);
}

/** Bilinmeyen değer (yazım hatası, eski sürüm) varsayılana düşer; ayar sayfası asla kaybolmaz. */
export function resolveSettingsGroup(value: unknown, fallback: SettingsGroupId): SettingsGroupId {
  return isSettingsGroupId(value) ? value : fallback;
}

export type SettingsEntryOrder = {
  group: SettingsGroupId;
  /** Grup içi sıra; eşitlikte `href` belirleyicidir. */
  order: number;
  href: string;
};

/** Deterministik sıra: grup sırası → grup içi sıra → adres (yerelden bağımsız). */
export function compareSettingsEntries(a: SettingsEntryOrder, b: SettingsEntryOrder): number {
  const groupDiff = (GROUP_INDEX.get(a.group) ?? 0) - (GROUP_INDEX.get(b.group) ?? 0);
  if (groupDiff !== 0) return groupDiff;
  if (a.order !== b.order) return a.order - b.order;
  return a.href < b.href ? -1 : a.href > b.href ? 1 : 0;
}

/** Girdileri `SETTINGS_GROUPS` sırasıyla gruplar; boş gruplar dönmez. */
export function groupSettingsEntries<T extends SettingsEntryOrder>(
  entries: readonly T[],
): { group: SettingsGroupId; items: T[] }[] {
  const sorted = [...entries].sort(compareSettingsEntries);
  return SETTINGS_GROUPS.map((group) => ({ group, items: sorted.filter((entry) => entry.group === group) })).filter(
    (section) => section.items.length > 0,
  );
}

/** `group: "settings"` nav öğesinin sıralama anahtarı. */
export function settingsPageOrder(item: { href: string; order: number; settingsGroup?: unknown; settingsOrder?: number }): SettingsEntryOrder {
  return {
    group: resolveSettingsGroup(item.settingsGroup, DEFAULT_SETTINGS_PAGE_GROUP),
    order: item.settingsOrder ?? item.order,
    href: item.href,
  };
}
