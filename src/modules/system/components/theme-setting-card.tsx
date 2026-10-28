"use client";

import { Check, Laptop, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTheme, type Theme } from "@/shared/components/theme-provider";
import { cn } from "@/shared/utils";

export function ThemeSettingCard() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("settings");

  const themes: {
    key: Theme;
    title: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
  }[] = [
    {
      key: "light",
      title: t.has("themeSection.light") ? t("themeSection.light") : "Açık Tema",
      description: t.has("themeSection.lightDesc")
        ? t("themeSection.lightDesc")
        : "Aydınlık ve yüksek kontrastlı standart arayüz",
      icon: Sun,
      iconColor: "text-amber-500 bg-amber-500/10",
    },
    {
      key: "dark",
      title: t.has("themeSection.dark") ? t("themeSection.dark") : "Koyu Tema",
      description: t.has("themeSection.darkDesc")
        ? t("themeSection.darkDesc")
        : "Göz yormayan koyu arka plan ve yumuşak renkler",
      icon: Moon,
      iconColor: "text-blue-500 bg-blue-500/10",
    },
    {
      key: "system",
      title: t.has("themeSection.system") ? t("themeSection.system") : "Sistem Teması",
      description: t.has("themeSection.systemDesc")
        ? t("themeSection.systemDesc")
        : "Cihazınızın işletim sistemi temasıyla otomatik senkronize",
      icon: Laptop,
      iconColor: "text-purple-500 bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
      {themes.map((item) => {
        const Icon = item.icon;
        const isSelected = theme === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTheme(item.key)}
            className={cn(
              "flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer shadow-xs gap-3",
              isSelected
                ? "border-primary bg-primary-50/50 dark:bg-primary-500/10 shadow-sm ring-1 ring-primary/20"
                : "border-default-200/80 bg-content1 hover:bg-default-100/60 hover:border-default-300",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className={cn("p-2 rounded-lg shadow-xs", item.iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
              {isSelected && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                </span>
              )}
            </div>
            <div>
              <p className="text-small font-semibold text-foreground">
                {item.title}
              </p>
              <p className="text-tiny text-default-400 mt-0.5 leading-snug">
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
