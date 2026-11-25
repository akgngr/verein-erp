import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, type Locale } from "./config";
import { resolveRequestLocale } from "./negotiate";

/**
 * next-intl request config — server tarafında hangi mesaj dosyasının
 * yükleneceğini belirler.
 *
 * KARAR (Verein pivotu): URL'de dil öneki YOKTUR (rota değişikliği gerektirmediği için).
 * Bu, next-intl'in "non-routing-based" modudur; proxy.ts Auth.js koruması yeterli.
 * Dil kaynağı NEXT_LOCALE çerezidir; çerez yoksa tarayıcının Accept-Language başlığı (#586), o da
 * eşleşmezse DEFAULT_LOCALE ("tr") kullanılır.
 * Çerezi next/headers ile doğrudan okuyoruz (requestLocale parametresi non-routing
 * modunda tanımsız geliyor; middleware stripte yok).
 *
 * Not: next-intl/plugin, bu dosyadan DEFAULT export bekler. Dosya adı da
 * next.config.ts'teki createNextIntlPlugin("./src/i18n/request.ts") çağrısıyla
 * eşleşmelidir.
 */
export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale: Locale = resolveRequestLocale(cookieStore.get("NEXT_LOCALE")?.value, headerStore.get("accept-language"));

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});

export { DEFAULT_LOCALE };
