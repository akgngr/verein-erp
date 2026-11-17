"use client";
import { InputGroup, TextField } from "@/shared/components/kit";
import { FieldClearButton } from "@/shared/components/forms/field-clear-button";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

export type SettingsHubItem = {
  key: string;
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

export type SettingsHubSection = {
  key: string;
  title: string;
  description: string;
  items: SettingsHubItem[];
};

/** Ayar merkezi: aranabilir, bölümlere ayrılmış ayar sayfası bağlantıları. */
export function SettingsHub({ sections }: { sections: SettingsHubSection[] }) {
  const t = useTranslations("settings");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();

  const filtered = sections
    .map((section) => ({
      ...section,
      items: needle
        ? section.items.filter((item) =>
            `${item.title} ${item.description}`
              .toLocaleLowerCase()
              .includes(needle),
          )
        : section.items,
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <TextField
        aria-label={t("searchPlaceholder")}
        value={query}
        onChange={setQuery}
        className={["max-w-md"].filter(Boolean).join(" ")}
      >
        <InputGroup>
          <InputGroup.Prefix>
            {<Search className="h-4 w-4 text-ink-400" aria-hidden />}
          </InputGroup.Prefix>
          <InputGroup.Input placeholder={t("searchPlaceholder")} />
          <InputGroup.Suffix>
            {query ? <FieldClearButton onPress={() => setQuery("")} /> : null}
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-500">{t("noResults")}</p>
      ) : null}

      {filtered.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="text-sm text-ink-500">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-2xl border border-ink-200/80 bg-surface p-4 shadow-xs transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform group-hover:scale-105 dark:bg-brand-500/15 dark:text-brand-300">
                  {item.icon}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-foreground group-hover:text-accent">
                    {item.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                    {item.description}
                  </span>
                </div>
                <ChevronRight
                  className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  aria-label={t("open")}
                />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
