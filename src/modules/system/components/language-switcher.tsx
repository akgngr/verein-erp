"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  addToast,
} from "@heroui/react";
import { Check, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/modules/auth/ui";
import { cn } from "@/shared/utils";

const LOCALE_FLAGS: Record<Locale, string> = {
  tr: "🇹🇷",
  de: "🇩🇪",
};

/**
 * Topbar için kompakt açılır dil değiştirici.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (key: string) => {
    const nextLocale = key as Locale;
    if (nextLocale === currentLocale) return;

    startTransition(async () => {
      const result = await setLocaleAction({ locale: nextLocale });
      if (!result.ok) {
        addToast({ title: result.error ?? "Dil değiştirilemedi.", color: "danger" });
        return;
      }
      addToast({
        title: nextLocale === "de" ? "Sprache geändert: Deutsch" : "Dil değiştirildi: Türkçe",
        color: "success",
      });
      router.refresh();
    });
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="Dil seçimi / Sprachauswahl"
          isLoading={isPending}
          className={cn("text-small font-semibold", className)}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
            <Globe className="h-4 w-4 text-default-500" />
            <span className="hidden sm:inline-block">{currentLocale}</span>
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Dil seçenekleri"
        selectedKeys={[currentLocale]}
        selectionMode="single"
        disallowEmptySelection
        onAction={(key) => handleSelect(String(key))}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownItem
            key={loc}
            startContent={<span className="text-base mr-1">{LOCALE_FLAGS[loc]}</span>}
            endContent={currentLocale === loc ? <Check className="h-4 w-4 text-primary" /> : null}
            className={currentLocale === loc ? "font-semibold text-primary" : ""}
          >
            {LOCALE_LABELS[loc]}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}

/**
 * Ayarlar sayfası için geniş kart tipi dil seçici.
 */
export function LanguageSettingCard() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (nextLocale: Locale) => {
    if (nextLocale === currentLocale) return;

    startTransition(async () => {
      const result = await setLocaleAction({ locale: nextLocale });
      if (!result.ok) {
        addToast({ title: result.error ?? "Dil değiştirilemedi.", color: "danger" });
        return;
      }
      addToast({
        title:
          nextLocale === "de"
            ? "Sprache erfolgreich auf Deutsch aktualisiert."
            : "Arayüz dili başarıyla Türkçe olarak güncellendi.",
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
                  {loc === "tr"
                    ? "Türkiye dernek standartları & Türkçe arayüz"
                    : "Deutscher Verein-Standard & deutsches Interface"}
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
