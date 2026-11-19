import Link from "next/link";
import { ArrowUpRight, CalendarCheck2, CircleAlert } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/shared/components/kit";
import type { Briefing, BriefingItem } from "@/shared/secretary/define";
import { SecretaryItemActions, type ItemActionLabels } from "./item-actions";

export type TodayCardLabels = {
  title: string;
  empty: string;
  failures: string;
  open: string;
  count: (value: number) => string;
  actions: ItemActionLabels;
};

/** Presentational, permission-filtered briefing only; safe for server-rendered surfaces. */
export function SecretaryTodayCard({
  briefing,
  labels,
  limit = 5,
}: {
  briefing: Briefing;
  labels: TodayCardLabels;
  limit?: number;
}) {
  const items = briefing.sections.flatMap((section) => section.items).slice(0, limit);
  const total = briefing.sections.reduce((sum, section) => sum + section.items.length, 0);
  return (
    <Card className="border border-ink-200/80 bg-surface shadow-sm">
      <CardHeader className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CalendarCheck2 className="size-4" aria-hidden="true" />
          {labels.title}
        </h2>
        <span className="text-xs text-ink-500">{labels.count(total)}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {briefing.failures.length > 0 ? (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/30 p-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {labels.failures}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="py-4 text-sm text-ink-500">{labels.empty}</p>
        ) : (
          <ul aria-label={labels.title} className="divide-y divide-ink-200/70">
            {items.map((item) => <TodayItem key={item.id} item={item} open={labels.open} actions={labels.actions} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TodayItem({ item, open, actions }: { item: BriefingItem; open: string; actions: ItemActionLabels }) {
  const severity = item.severity === "danger" ? "bg-danger" :
    item.severity === "warning" ? "bg-warning" : "bg-ink-400";
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <SecretaryItemActions itemId={item.id} labels={actions}>
      <div className="flex items-start gap-3">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${severity}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{item.title}</p>
        {item.detail ? <p className="mt-1 break-words text-xs text-ink-500">{item.detail}</p> : null}
        {item.dueAt ? <time dateTime={item.dueAt} className="mt-1 block text-xs text-ink-500">{item.dueAt.slice(0, 10)}</time> : null}
      </div>
      <Link href={item.href} aria-label={`${open}: ${item.title}`} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-accent outline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2">
        {open} <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
      </div>
      </SecretaryItemActions>
    </li>
  );
}
