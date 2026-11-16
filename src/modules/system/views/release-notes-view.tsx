import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { moduleReleases } from "@/module-releases";
import { PageHeader } from "@/shared/components/ui/page-header";
import { cn } from "@/shared/utils";

import changelog from "../changelog.json";

import type {
  ModuleRelease as Release,
  ReleaseChange as Change,
} from "@/shared/modules/releases";

const TYPE_STYLE: Record<Change["type"], string> = {
  feature:
    "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  improvement:
    "bg-secondary-50 text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-300",
  fix: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300",
  security:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300",
};

/**
 * Sürüm notları: uygulamanın (changelog.json) veya ?modul=<anahtar> ile bir modülün (releases.json)
 * sürüm serisi, en yeni üstte; metinler arayüz diline göre.
 */
export async function ReleaseNotesView({
  moduleKey,
}: { moduleKey?: string | null } = {}) {
  const [t, tRoot, locale] = await Promise.all([
    getTranslations("system.releases"),
    getTranslations(),
    getLocale(),
  ]);
  const lang = locale === "de" ? "de" : "tr";
  const selected =
    moduleReleases.find((entry) => entry.moduleKey === moduleKey) ?? null;
  const releases: Release[] = selected
    ? selected.releases
    : (changelog as { releases: Release[] }).releases;
  const moduleLabel = (key: string) => tRoot(`${key}.module.label` as never);
  const modules = [...moduleReleases].sort((a, b) =>
    moduleLabel(a.moduleKey).localeCompare(moduleLabel(b.moduleKey), lang),
  );
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active
        ? "border-accent bg-accent text-accent-foreground"
        : "border-ink-200 text-ink-600 hover:bg-ink-100",
    );
  const dateFormat = new Intl.DateTimeFormat(
    lang === "de" ? "de-DE" : "tr-TR",
    { dateStyle: "long", timeZone: "UTC" },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          selected
            ? t("moduleTitle", { module: moduleLabel(selected.moduleKey) })
            : t("title")
        }
        description={
          selected
            ? t("moduleDescription", { version: releases[0]?.version ?? "" })
            : t("description", { version: releases[0]?.version ?? "" })
        }
      />
      <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2">
        <Link href="/ayarlar/surum-notlari" className={pill(!selected)}>
          {t("application")}
        </Link>
        {modules.map((entry) => (
          <Link
            key={entry.moduleKey}
            href={`/ayarlar/surum-notlari?modul=${entry.moduleKey}`}
            className={pill(selected?.moduleKey === entry.moduleKey)}
          >
            {moduleLabel(entry.moduleKey)}{" "}
            <span className="opacity-70">v{entry.releases[0]?.version}</span>
          </Link>
        ))}
      </nav>
      <ol className="relative flex flex-col gap-6 border-l border-ink-200 pl-6">
        {releases.map((release, index) => (
          <li key={release.version} className="relative">
            <span
              className={cn(
                "absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background",
                index === 0 ? "bg-accent" : "bg-ink-300",
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold">v{release.version}</h2>
              {index === 0 ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  {t("current")}
                </span>
              ) : null}
              <time dateTime={release.date} className="text-sm text-ink-500">
                {dateFormat.format(new Date(`${release.date}T00:00:00Z`))}
              </time>
              {selected && release.appVersion ? (
                <span className="text-xs text-ink-400">
                  {t("appVersion", { version: release.appVersion })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {release.title[lang]}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {release.changes.map((change, position) => (
                <li
                  key={position}
                  className="flex items-start gap-2 text-sm text-ink-700"
                >
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-lg px-1.5 py-0.5 text-xs font-medium",
                      TYPE_STYLE[change.type],
                    )}
                  >
                    {t(`types.${change.type}`)}
                  </span>
                  <span>{change[lang]}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
