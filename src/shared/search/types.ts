export type QuickSearchResultKind = "page" | "record";

export interface QuickSearchItem {
  id: string;
  kind: QuickSearchResultKind;
  moduleKey: string;
  title: string;
  subtitle?: string | null;
  href: string;
  keywords?: string;
}

export interface QuickSearchApiResponse {
  ok: boolean;
  items: QuickSearchItem[];
}

/**
 * Normalizes text for Turkish/German diacritic-insensitive matching
 * (e.g. `ü` -> `u`, `ö` -> `o`, `ş` -> `s`, `ç` -> `c`, `ğ` -> `g`, `ı`/`İ` -> `i`, `ß` -> `ss`).
 */
export function normalizeSearchText(value: string): string {
  return value
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Filters navigation/page commands locally using normalized substring matching. */
export function filterQuickSearchItems(
  items: readonly QuickSearchItem[],
  query: string,
  limit = 10,
): QuickSearchItem[] {
  const needle = normalizeSearchText(query);
  if (!needle) return items.slice(0, limit);
  const terms = needle.split(/\s+/).filter(Boolean);

  const scored: Array<{ item: QuickSearchItem; score: number }> = [];
  for (const item of items) {
    const haystack = normalizeSearchText(
      [item.title, item.subtitle ?? "", item.moduleKey, item.keywords ?? ""].join(" "),
    );
    if (!terms.every((term) => haystack.includes(term))) continue;
    const titleNorm = normalizeSearchText(item.title);
    const score = titleNorm.startsWith(needle)
      ? 3
      : titleNorm.includes(needle)
        ? 2
        : 1;
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, limit).map((entry) => entry.item);
}
