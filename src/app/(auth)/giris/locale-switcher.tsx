"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { Button, ButtonGroup } from "@/shared/components/kit";

/** Oturum yokken dil tercihi: next-intl'in okuduğu çerez (1 yıl, tüm rotalar). */
function writeLocaleCookie(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * #586: Giriş sayfasında TR/DE dil seçimi (oturum yok). Seçim NEXT_LOCALE çerezine yazılır; giriş sonrası
 * kullanıcı tercihi (User.locale) yine geçerlidir.
 */
export function LoginLocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    writeLocaleCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <ButtonGroup size="sm" variant="ghost" aria-label={t("languageSelect")} isDisabled={pending}>
      {SUPPORTED_LOCALES.map((option) => (
        <Button
          key={option}
          aria-pressed={option === locale}
          aria-label={LOCALE_LABELS[option]}
          className={option === locale ? "font-semibold text-foreground" : "text-ink-500"}
          onPress={() => choose(option)}
        >
          <span lang={option}>{option.toUpperCase()}</span>
        </Button>
      ))}
    </ButtonGroup>
  );
}
