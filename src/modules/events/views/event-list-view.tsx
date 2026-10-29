import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react"
import { PageHeader } from "@/shared/components/ui/page-header"
import { LinkButton } from "@/shared/components/ui/link-button"
import { parseListParams, type RawSearchParams } from "@/shared/list-params"
import { listEvents } from "../queries/list-events"
import { EventTable } from "../components/event-table"
import { EventCreateModal } from "../components/event-create-modal"
import { StatsCards } from "../components/stats-cards"
import type { EventType, EventStatus } from "../types"

interface EventListViewProps {
  searchParams: Promise<RawSearchParams>
}

export async function EventListView({ searchParams }: EventListViewProps) {
  const tEvents = await getTranslations("events");
  const raw = await searchParams

  const params = parseListParams(raw, {
    sortableFields: ["title", "startDate", "status", "type"],
    defaultSort: "startDate",
    defaultDir: "asc",
    filterKeys: ["type", "status", "timeFilter"],
  })

  const [{ items, total }, { stats }] = await Promise.all([
    listEvents({
      q: params.q,
      type: params.filters.type as EventType,
      status: params.filters.status as EventStatus,
      timeFilter: params.filters.timeFilter as "all" | "upcoming" | "past",
      sort: params.sort,
      dir: params.dir,
      page: params.page,
      pageSize: params.pageSize,
    }),
    listEvents({}),
  ])

  const isModalOpen = raw.action === "new"

  return (
    <div>
      <PageHeader
        title={tEvents("title")}
        description={tEvents("description")}
        actions={
          <LinkButton
            href="/events?action=new"
            color="primary"
            startIcon={<Plus className="h-4 w-4" />}
          >
            {tEvents("newEvent")}
          </LinkButton>
        }
      />

      <StatsCards stats={stats} />

      <EventTable
        items={items}
        total={total}
        page={params.page}
        pageSize={params.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
      />

      <EventCreateModal isOpen={isModalOpen} />
    </div>
  )
}
