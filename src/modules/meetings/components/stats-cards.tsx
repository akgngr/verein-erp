import { CalendarClock, ClipboardCheck, ListTodo, AlarmClock } from "lucide-react";
import Link from "next/link";

import type { MeetingStats } from "../types";

/**
 * Toplantı istatistik kartları (7.1): tıklanınca eşleşen liste filtresi ya da
 * görev listesi uygulanır (11. bölüm panel kartıyla aynı sayımlar).
 */
export function StatsCards({ stats }: { stats: MeetingStats }) {
  const cards = [
    {
      label: "Planlanan toplantılar",
      value: stats.plannedCount,
      href: stats.plannedCount > 0 ? "/toplantilar?filter.status=PLANNED" : null,
      icon: CalendarClock,
      tone: "text-primary",
    },
    {
      label: "Onay bekleyen tutanaklar",
      value: stats.draftMinutesCount,
      href: stats.draftMinutesCount > 0 ? "/toplantilar?filter.status=HELD" : null,
      icon: ClipboardCheck,
      tone: "text-secondary",
    },
    {
      label: "Açık görevler",
      value: stats.openActionItems,
      href: stats.openActionItems > 0 ? "/toplantilar/gorevler" : null,
      icon: ListTodo,
      tone: "text-success",
    },
    {
      label: "Gecikmiş görevler",
      value: stats.overdueActionItems,
      href:
        stats.overdueActionItems > 0
          ? "/toplantilar/gorevler?filter.overdue=1"
          : null,
      icon: AlarmClock,
      tone: "text-danger",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const content = (
          <div className="flex items-center gap-3 rounded-medium border border-default-200 bg-content1 px-4 py-3 shadow-sm transition-transform hover:-translate-y-0.5">
            <Icon className={`h-6 w-6 ${card.tone}`} aria-hidden />
            <div>
              <p className="text-2xl font-semibold leading-none">{card.value}</p>
              <p className="text-tiny text-default-500">{card.label}</p>
            </div>
          </div>
        );
        return card.href ? (
          <Link key={card.label} href={card.href} className="contents">
            {content}
          </Link>
        ) : (
          <div key={card.label}>{content}</div>
        );
      })}
    </div>
  );
}
