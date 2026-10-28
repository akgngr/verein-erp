import { CalendarDays, CalendarCheck, Users } from "lucide-react"
import Link from "next/link"
import type { EventStats } from "../types"

/**
 * Etkinlik modülü istatistik kartları.
 * Verein ERP tasarım standardı ile uyumlu; tıklanabilir ve ilgili filtreye yönlendirir.
 */
export function StatsCards({ stats }: { stats: EventStats }) {
  const cards = [
    {
      label: "Toplam Etkinlik",
      value: stats.totalEvents,
      href: "/events",
      icon: CalendarDays,
      tone: "text-primary",
    },
    {
      label: "Yaklaşan Etkinlikler",
      value: stats.upcomingEventsCount,
      href: "/events?filter.timeFilter=upcoming",
      icon: CalendarCheck,
      tone: "text-success",
    },
    {
      label: "Bu Ayki Katılımcı",
      value: stats.totalAttendeesMonth,
      href: "/events",
      icon: Users,
      tone: "text-secondary",
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        const content = (
          <div className="flex items-center gap-3 rounded-medium border border-default-200 bg-content1 px-4 py-3 shadow-xs transition-transform hover:-translate-y-0.5">
            <Icon className={`h-6 w-6 ${card.tone}`} aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold leading-none">{card.value}</p>
              <p className="text-tiny text-default-500 mt-1">{card.label}</p>
            </div>
          </div>
        )
        return card.href ? (
          <Link key={card.label} href={card.href} className="contents">
            {content}
          </Link>
        ) : (
          <div key={card.label}>{content}</div>
        )
      })}
    </div>
  )
}
