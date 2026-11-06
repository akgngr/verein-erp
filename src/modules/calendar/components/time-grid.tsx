"use client";

import { useEffect, useMemo, useRef } from "react";

import { addDays, sameDay, startOfDay } from "../lib/dates";
import { layoutDay } from "../lib/layout";
import type { CalendarItemView } from "../types";

const HOUR_PX = 56;
const SCROLL_TO_HOUR = 7.5;

type Props = {
  days: Date[];
  items: CalendarItemView[];
  today: Date;
  locale: string;
  allDayLabel: string;
  onSlot: (start: Date, allDay: boolean) => void;
  onItem: (item: CalendarItemView) => void;
};

/** Week/day time grid with an all-day row and overlap-aware columns. */
export function TimeGrid({ days, items, today, locale, allDayLabel, onSlot, onItem }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ top: SCROLL_TO_HOUR * HOUR_PX }); }, []);

  const perDay = useMemo(() => days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const inDay = items.filter((item) => new Date(item.start) < dayEnd && new Date(item.end) > dayStart);
    const allDay = inDay.filter((item) => item.allDay || new Date(item.end).getTime() - new Date(item.start).getTime() >= 86_400_000);
    const timed = inDay.filter((item) => !allDay.includes(item));
    const placed = layoutDay(timed.map((item) => ({
      id: item.id,
      start: new Date(Math.max(new Date(item.start).getTime(), dayStart.getTime())),
      end: new Date(Math.min(new Date(item.end).getTime(), dayEnd.getTime())),
    })));
    return { day: dayStart, allDay, timed, placed };
  }), [days, items]);

  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const timeLabel = (hour: number) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(2000, 0, 1, hour));
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const columns = `4rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Day headers */}
      <div className="grid border-b border-default-200" style={{ gridTemplateColumns: columns }}>
        <div />
        {days.map((day) => {
          const isToday = sameDay(day, today);
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-2">
              <span className={`text-tiny ${weekend ? "text-danger" : "text-default-500"}`}>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</span>
              <span className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full text-xl ${isToday ? "bg-primary-100 font-semibold text-primary" : weekend ? "text-danger" : ""}`}>{day.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid border-b border-default-200" style={{ gridTemplateColumns: columns }}>
        <div className="flex items-center justify-end pe-2 text-tiny text-default-500">{allDayLabel}</div>
        {perDay.map(({ day, allDay }) => (
          <div key={day.toISOString()} className="flex min-h-9 flex-col gap-1 border-s border-default-100 p-1" onDoubleClick={() => onSlot(day, true)}>
            {allDay.map((item) => (
              <button key={item.id} type="button" onClick={() => onItem(item)} className="truncate rounded-small px-2 py-0.5 text-start text-tiny font-medium" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
                {item.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Hours */}
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div>
            {hours.map((hour) => (
              <div key={hour} className="relative text-end text-tiny text-default-400" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 end-2">{hour ? timeLabel(hour) : ""}</span>
              </div>
            ))}
          </div>
          {perDay.map(({ day, timed, placed }) => (
            <div key={day.toISOString()} className={`relative border-s border-default-100 ${day.getDay() === 0 || day.getDay() === 6 ? "bg-default-50" : ""}`}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-default-100 hover:bg-default-100/60"
                  style={{ height: HOUR_PX }}
                  onClick={() => onSlot(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour), false)}
                />
              ))}
              {sameDay(day, today) ? (
                <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger" style={{ top: (nowMinutes / 60) * HOUR_PX }} />
              ) : null}
              {timed.map((item) => {
                const layout = placed.get(item.id);
                const start = Math.max(new Date(item.start).getTime(), day.getTime());
                const end = Math.min(new Date(item.end).getTime(), addDays(day, 1).getTime());
                const top = ((start - day.getTime()) / 3_600_000) * HOUR_PX;
                const height = Math.max(22, ((end - start) / 3_600_000) * HOUR_PX - 2);
                const width = 100 / (layout?.columns ?? 1);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onItem(item); }}
                    className="absolute overflow-hidden rounded-small border-s-4 px-2 py-1 text-start text-tiny shadow-small"
                    style={{
                      top,
                      height,
                      insetInlineStart: `calc(${(layout?.column ?? 0) * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      backgroundColor: `${item.color}1f`,
                      borderColor: item.color,
                    }}
                  >
                    <span className="block font-medium" style={{ color: item.color }}>
                      {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(item.start))}
                    </span>
                    <span className="line-clamp-3 font-medium text-foreground">{item.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
