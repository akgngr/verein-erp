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
import type { ActionResult } from "@/shared/types/action";
import { cn } from "@/shared/utils";

const LOCALE_FLAGS: Record<Locale, string> = {
  tr: "🇹🇷",
  de: "🇩🇪",
};

/**
 * Topbar için kompakt açılır dil değiştirici (TR / DE).
 */
export function LanguageSwitcher({
  onSetLocale,
  className,
}: {
  /** layout (sunucu) tarafından aktarılan setLocaleAction referansı. */
  onSetLocale: (input: { locale: Locale }) => Promise<ActionResult<Locale>>;
  className?: string;
}) {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (key: string) => {
    const nextLocale = key as Locale;
    if (nextLocale === currentLocale) return;

    startTransition(async () => {
      const result = await onSetLocale({ locale: nextLocale });
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
