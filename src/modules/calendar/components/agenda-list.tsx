"use client";

import { startOfDay } from "../lib/dates";
import type { CalendarItemView } from "../types";

type Props = {
  from: Date;
  items: CalendarItemView[];
  locale: string;
  emptyLabel: string;
  allDayLabel: string;
  onItem: (item: CalendarItemView) => void;
};

export function AgendaList({ from, items, locale, emptyLabel, allDayLabel, onItem }: Props) {
  const upcoming = items.filter((item) => new Date(item.end) >= from);
  if (!upcoming.length) return <p className="p-8 text-center text-small text-default-500">{emptyLabel}</p>;
  const groups = new Map<number, CalendarItemView[]>();
  for (const item of upcoming) {
    const key = Math.max(startOfDay(new Date(item.start)).getTime(), from.getTime());
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const time = (value: string) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  return (
    <div className="max-h-[70vh] divide-y divide-default-100 overflow-y-auto">
      {[...groups.entries()].sort((a, b) => a[0] - b[0]).map(([key, group]) => (
        <section key={key} className="flex gap-4 px-4 py-3">
          <p className="w-32 shrink-0 text-small font-semibold capitalize">{new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(key))}</p>
          <ul className="flex flex-1 flex-col gap-1">
            {group.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onItem(item)} className="flex w-full items-center gap-3 rounded-medium px-2 py-1 text-start hover:bg-default-100">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="w-28 shrink-0 text-small text-default-500">{item.allDay ? allDayLabel : `${time(item.start)} – ${time(item.end)}`}</span>
                  <span className="truncate text-small font-medium">{item.title}</span>
                  {item.location ? <span className="truncate text-tiny text-default-500">· {item.location}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
