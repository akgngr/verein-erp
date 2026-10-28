import Link from "next/link"
import { PageHeader } from "@/shared/components/ui/page-header"
import { EmptyState } from "@/shared/components/ui/empty-state"
import {
  CalendarDays,
  CalendarCheck,
  Users,
  Search,
  ChevronDown,
} from "lucide-react"
import { listEvents } from "../queries/list-events"
import { EventTable } from "../components/event-table"
import { EventCreateModal } from "../components/event-create-modal"
import { EVENT_TYPES, EVENT_STATUSES } from "../constants"
import type { EventType, EventStatus } from "../types"

interface EventListViewProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function EventListView({ searchParams }: EventListViewProps) {
  const resolvedParams = await searchParams

  const query =
    typeof resolvedParams.q === "string" ? resolvedParams.q : undefined
  const type =
    typeof resolvedParams.type === "string"
      ? (resolvedParams.type as EventType)
      : undefined
  const status =
    typeof resolvedParams.status === "string"
      ? (resolvedParams.status as EventStatus)
      : undefined
  const timeFilter =
    typeof resolvedParams.timeFilter === "string"
      ? (resolvedParams.timeFilter as "all" | "upcoming" | "past")
      : undefined
  const page =
    typeof resolvedParams.page === "string"
      ? parseInt(resolvedParams.page, 10)
      : 1
  const pageSize =
    typeof resolvedParams.pageSize === "string"
      ? parseInt(resolvedParams.pageSize, 10)
      : 10

  const { items, total, totalPages, stats } = await listEvents({
    query,
    type,
    status,
    timeFilter,
    page,
    pageSize,
  })

  const isModalOpen = resolvedParams.action === "new"

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Etkinlikler"
        description="Dernek etkinlikleri, seminerler, atölyeler ve katılımcı kayıt yönetimi."
        actions={
          <Link
            href="/events?action=new"
            className="inline-flex items-center justify-center rounded-medium bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            + Yeni Etkinlik
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-divider bg-background p-4 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-default-500 font-medium">
              Toplam Etkinlik
            </span>
            <span className="text-xl font-bold text-foreground">
              {stats.totalEvents}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-divider bg-background p-4 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-default-500 font-medium">
              Yaklaşan Etkinlikler
            </span>
            <span className="text-xl font-bold text-foreground">
              {stats.upcomingEventsCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-divider bg-background p-4 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-default-500 font-medium">
              Bu Ayki Kayıtlı Katılımcı
            </span>
            <span className="text-xl font-bold text-foreground">
              {stats.totalAttendeesMonth}
            </span>
          </div>
        </div>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-divider bg-background shadow-xs"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Etkinlik adı veya konum ara..."
            className="h-9 w-full rounded-medium bg-default-100 pl-9 pr-3 text-xs text-foreground placeholder:text-default-400 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 border border-transparent focus:border-primary/50"
          />
        </div>

        <div className="relative min-w-[140px]">
          <select
            name="type"
            defaultValue={type ?? "ALL"}
            className="h-9 w-full appearance-none rounded-medium bg-default-100 px-3 pr-8 text-xs text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
          >
            <option value="ALL">Tüm Türler</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.labelTr}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
        </div>

        <div className="relative min-w-[140px]">
          <select
            name="status"
            defaultValue={status ?? "ALL"}
            className="h-9 w-full appearance-none rounded-medium bg-default-100 px-3 pr-8 text-xs text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
          >
            <option value="ALL">Tüm Durumlar</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.labelTr}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
        </div>

        <button
          type="submit"
          className="h-9 px-4 rounded-medium bg-default-200 text-xs font-semibold text-foreground hover:bg-default-300 transition-colors"
        >
          Filtrele
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Etkinlik kaydı bulunamadı"
          description="Arama kriterlerinize uygun etkinlik bulunamadı veya henüz hiçbir etkinlik eklenmedi."
        />
      ) : (
        <EventTable
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
        />
      )}

      <EventCreateModal isOpen={isModalOpen} />
    </div>
  )
}
