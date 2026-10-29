"use client";

import { addToast } from "@heroui/react";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import type { ActionResult } from "@/shared/types/action";
import { cn } from "@/shared/utils";

const LOCALE_FLAGS: Record<Locale, string> = {
  tr: "🇹🇷",
  de: "🇩🇪",
};

/**
 * Ayarlar sayfası için geniş kart tipi dil seçici.
 */
export function LanguageSettingCard({
  onSetLocale,
}: {
  /** Server component view tarafından aktarılan setLocaleAction referansı. */
  onSetLocale: (input: { locale: Locale }) => Promise<ActionResult<Locale>>;
}) {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("settings.languageSection");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (nextLocale: Locale) => {
    if (nextLocale === currentLocale) return;

    startTransition(async () => {
      const result = await onSetLocale({ locale: nextLocale });
      if (!result.ok) {
        addToast({ title: tCommon("languageChangeFailed"), color: "danger" });
        return;
      }
      addToast({
        // Bildirim yeni dilde gösterilir; mesajlar henüz eski dilde yüklü olduğundan dil adı kullanılır.
        title: t("switchedTo", { language: LOCALE_LABELS[nextLocale] }),
        color: "success",
      });
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {SUPPORTED_LOCALES.map((loc) => {
        const isSelected = currentLocale === loc;
        return (
          <button
            key={loc}
            type="button"
            disabled={isPending}
            onClick={() => handleSwitch(loc)}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-xs",
              isSelected
                ? "border-primary bg-primary-50/50 dark:bg-primary-500/10 shadow-sm ring-1 ring-primary/20"
                : "border-default-200/80 bg-content1 hover:bg-default-100/60 hover:border-default-300",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-lg bg-default-100/80 shadow-xs">
                {LOCALE_FLAGS[loc]}
              </span>
              <div>
                <p className="text-small font-semibold text-foreground">
                  {LOCALE_LABELS[loc]}
                </p>
                <p className="text-tiny text-default-400">
                  {t(loc === "tr" ? "trHint" : "deHint")}
                </p>
              </div>
            </div>
            {isSelected ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
