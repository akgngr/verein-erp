"use client";

import { addDays, monthGrid, sameDay, startOfDay } from "../lib/dates";
import type { CalendarItemView } from "../types";

const MAX_PER_DAY = 3;

type Props = {
  anchor: Date;
  items: CalendarItemView[];
  today: Date;
  locale: string;
  moreLabel: (count: number) => string;
  onDay: (date: Date) => void;
  onCreate: (date: Date) => void;
  onItem: (item: CalendarItemView) => void;
};

export function MonthGrid({ anchor, items, today, locale, moreLabel, onDay, onCreate, onItem }: Props) {
  const days = monthGrid(anchor);
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-default-200">
        {days.slice(0, 7).map((day) => (
          <div key={day.getDay()} className={`py-2 text-center text-tiny font-medium ${day.getDay() === 0 || day.getDay() === 6 ? "text-danger" : "text-default-500"}`}>
            {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const inDay = items.filter((item) => new Date(item.start) < dayEnd && new Date(item.end) > dayStart);
          const inMonth = day.getMonth() === anchor.getMonth();
          return (
            <div key={day.toISOString()} className={`min-h-24 border-b border-e border-default-100 p-1 ${inMonth ? "" : "bg-default-50"}`} onDoubleClick={() => onCreate(dayStart)}>
              <button type="button" onClick={() => onDay(dayStart)} className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-tiny ${sameDay(day, today) ? "bg-primary text-primary-foreground" : inMonth ? "" : "text-default-400"}`}>
                {day.getDate()}
              </button>
              <div className="flex flex-col gap-0.5">
                {inDay.slice(0, MAX_PER_DAY).map((item) => (
                  <button key={item.id} type="button" onClick={() => onItem(item)} className="flex items-center gap-1 truncate rounded-small px-1 text-start text-tiny hover:bg-default-100">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    {!item.allDay ? <span className="text-default-500">{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(item.start))}</span> : null}
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
                {inDay.length > MAX_PER_DAY ? (
                  <button type="button" onClick={() => onDay(dayStart)} className="px-1 text-start text-tiny font-medium text-primary">{moreLabel(inDay.length - MAX_PER_DAY)}</button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
