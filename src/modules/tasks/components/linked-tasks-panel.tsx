"use client";

import { ArrowUpRight, CalendarClock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Card, StatusChip, TextLink } from "@/shared/components/kit";

import type { UnifiedLinkedTaskItem } from "../queries/unified-hub";

export function LinkedTasksPanel({
  items,
}: {
  items: UnifiedLinkedTaskItem[];
}) {
  const t = useTranslations("tasks.linkedHub");
  const format = useFormatter();

  if (items.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-ink-500">{t("description")}</p>
        </div>
        <StatusChip tone="default">{t("count", { count: items.length })}</StatusChip>
      </div>
      <div className="flex flex-col divide-y divide-ink-200">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={item.source === "meetings" ? "primary" : "warning"}>
                  {t(`sources.${item.source}`)}
                </StatusChip>
                {item.overdue ? (
                  <StatusChip tone="danger">{t("overdue")}</StatusChip>
                ) : null}
                <span className="truncate text-sm font-medium text-foreground">
                  {item.title}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                <span>{item.subtitle}</span>
                {item.assigneeLabel ? <span>· {item.assigneeLabel}</span> : null}
                {item.dueAt ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    {format.dateTime(new Date(item.dueAt), { dateStyle: "medium" })}
                  </span>
                ) : null}
              </div>
            </div>
            <TextLink
              href={item.href}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              {t("openSource")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </TextLink>
          </div>
        ))}
      </div>
    </Card>
  );
}
