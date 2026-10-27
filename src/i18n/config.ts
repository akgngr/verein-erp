/**
 * i18n yapılandırması (Verein pivotu — TR + DE çift dilli).
 *
 * KARAR: Dil tercihi çerez tabanlıdır (next-intl NEXT_LOCALE çerezi). URL'de
 * /tr/ veya /de/ öneki YOKTUR — mevcut rotalar korunur (Faz 0-3 rota
 * yapısını bozmamak için). Kullanıcı dilini User.locale alanından okuruz;
 * kullanıcı UserMenu'den dil değiştirdiğinde setLocaleAction ile hem
 * User.locale güncellenir hem de çerez yazılır. Çerez, login sırasında
 * User.locale değerine eşitlenir.
 *
 * Şu an desteklenen diler: tr (Türkçe) ve de (Almanca). Yeni dil eklemek için:
 * 1. messages/<locale>.json oluştur
 * 2. SUPPORTED_LOCALES'e ekle
 * 3. LocaleFormat tipini genişlet
 */

export const SUPPORTED_LOCALES = ["tr", "de"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  de: "Deutsch",
};

/** Kullanıcıdan gelen değerin desteklenen locale olup olmadığını doğrular. */
export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Verilen değeri Locale'e dönüştürür; geçersizse DEFAULT_LOCALE döner. */
export function toLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
