import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/**
 * #586: `Accept-Language` başlığından desteklenen dili seçer (q ağırlığına göre; "de-AT" → "de").
 * Çerez yoksa kullanılır; böylece Almanca tarayıcılar /giris, /portal, /formular ve /oy sayfalarını
 * Türkçe yerine Almanca görür. Eşleşme yoksa null döner.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  const candidates = acceptLanguage
    .split(",")
    .slice(0, 20)
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { base: tag.trim().toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((candidate) => candidate.base && candidate.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const candidate of candidates) {
    if (isLocale(candidate.base)) return candidate.base;
  }
  return null;
}

/** Çerez (açık tercih) → Accept-Language → varsayılan dil. */
export function resolveRequestLocale(cookieValue: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return negotiateLocale(acceptLanguage) ?? DEFAULT_LOCALE;
}
