import { getLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/shared/components/ui/page-header";
import { cn } from "@/shared/utils";

import changelog from "../changelog.json";

type Change = { type: "feature" | "improvement" | "fix" | "security"; tr: string; de: string };
type Release = { version: string; date: string; title: { tr: string; de: string }; changes: Change[] };

const TYPE_STYLE: Record<Change["type"], string> = {
  feature: "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300",
  improvement: "bg-secondary-50 text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-300",
  fix: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300",
  security: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300",
};

/** Sürüm notları: changelog.json'daki sürüm serisi, en yeni üstte; metinler arayüz diline göre. */
export async function ReleaseNotesView() {
  const [t, locale] = await Promise.all([getTranslations("system.releases"), getLocale()]);
  const lang = locale === "de" ? "de" : "tr";
  const releases = (changelog as { releases: Release[] }).releases;
  const dateFormat = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "tr-TR", { dateStyle: "long", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description", { version: releases[0]?.version ?? "" })} />
      <ol className="relative flex flex-col gap-6 border-l border-default-200 pl-6">
        {releases.map((release, index) => (
          <li key={release.version} className="relative">
            <span className={cn("absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background", index === 0 ? "bg-primary" : "bg-default-300")} aria-hidden />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-medium font-semibold">v{release.version}</h2>
              {index === 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-tiny font-medium text-primary-foreground">{t("current")}</span> : null}
              <time dateTime={release.date} className="text-small text-default-500">
                {dateFormat.format(new Date(`${release.date}T00:00:00Z`))}
              </time>
            </div>
            <p className="mt-1 text-small font-medium text-foreground">{release.title[lang]}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {release.changes.map((change, position) => (
                <li key={position} className="flex items-start gap-2 text-small text-default-700">
                  <span className={cn("mt-0.5 shrink-0 rounded-medium px-1.5 py-0.5 text-tiny font-medium", TYPE_STYLE[change.type])}>{t(`types.${change.type}`)}</span>
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
