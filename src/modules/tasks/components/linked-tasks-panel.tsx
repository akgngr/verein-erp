"use client";

import { ArrowUpRight, CalendarClock, Handshake, UsersRound } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/kit";

import type { UnifiedLinkedTaskItem } from "../queries/unified-hub";

/**
 * Birleşik Görev Merkezi (#636): Toplantı aksiyon maddeleri ve CRM takiplerini
 * kaynak bağlantılarıyla birlikte tek görünümde sunar.
 */
export function LinkedTasksPanel({
  items,
}: {
  items: readonly UnifiedLinkedTaskItem[];
}) {
  const t = useTranslations("tasks.unifiedHub");
  const format = useFormatter();

  if (items.length === 0) return null;

  return (
    <section
      aria-label={t("title")}
      className="rounded-xl border border-ink-200 bg-surface p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="text-xs text-ink-500">{t("description")}</p>
        </div>
        <StatusChip tone="default">{t("count", { count: items.length })}</StatusChip>
      </div>

      <ul className="divide-y divide-ink-100">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={item.source === "meetings" ? "primary" : "secondary"}>
                  {item.source === "meetings" ? (
                    <UsersRound className="h-3 w-3" aria-hidden />
                  ) : (
                    <Handshake className="h-3 w-3" aria-hidden />
                  )}
                  {t(`sources.${item.source}`)}
                </StatusChip>
                <span className="truncate font-medium text-foreground">
                  {item.title}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span>{item.contextLabel}</span>
                {item.assigneeLabel ? <span>· {item.assigneeLabel}</span> : null}
                {item.dueDate ? (
                  <span
                    className={`inline-flex items-center gap-1 ${
                      item.isOverdue ? "font-medium text-danger" : ""
                    }`}
                  >
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {format.dateTime(new Date(`${item.dueDate}T12:00:00Z`), {
                      dateStyle: "medium",
                    })}
                    {item.isOverdue ? ` (${t("overdue")})` : ""}
                  </span>
                ) : null}
              </div>
            </div>
            <Link
              href={item.href}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-surface-muted"
            >
              {t("openSource")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
