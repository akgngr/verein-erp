import { getLocale, getTranslations } from "next-intl/server";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ArrowLeft,
  Users,
  FileSpreadsheet,
} from "lucide-react"
import { notFound } from "next/navigation"
import { PageHeader } from "@/shared/components/ui/page-header"
import { LinkButton } from "@/shared/components/ui/link-button"
import { getEventById } from "../queries/get-event"
import { AttendeeList } from "../components/attendee-list"
import { EVENT_TYPES, EVENT_STATUSES } from "../constants"
import {
  calculateCapacityRatio,
  formatDateTimeTr,
} from "../helpers/event-helpers"

interface EventDetailViewProps {
  eventId: string
}

export async function EventDetailView({ eventId }: EventDetailViewProps) {
  const tStatus = await getTranslations("events.status");
  const tTypes = await getTranslations("events.types");
  const tDetail = await getTranslations("events.detailView");
  const tEvents = await getTranslations("events");
  const event = await getEventById(eventId)
  const locale = await getLocale()

  if (!event) {
    notFound()
  }

  const typeMeta = EVENT_TYPES.find((t) => t.value === event.type)
  const statusMeta = EVENT_STATUSES.find((s) => s.value === event.status)
  const capacityRatio = calculateCapacityRatio(
    event.registeredCount,
    event.capacity,
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2">
          <LinkButton
            href="/events"
            variant="light"
            size="sm"
            color="default"
            startIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {tEvents("backToList")}
          </LinkButton>
        </div>

        <PageHeader
          title={event.title}
          description={`${typeMeta ? tTypes(typeMeta.value) : event.type} · ${formatDateTimeTr(event.startDate, locale)}${
            event.isOnline
              ? " · Online"
              : event.location
                ? ` · ${event.location}`
                : ""
          }`}
          actions={
            <div className="flex items-center gap-2">
              <a
                href="/api/events/export"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-medium border border-default-300 bg-content1 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-default-100 shadow-xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-success" />
                Excel&apos;e Aktar
              </a>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 -mt-4 mb-2">
        <span className="inline-flex items-center rounded-medium bg-default-100 px-2.5 py-1 text-xs font-medium text-foreground">
          {typeMeta ? tTypes(typeMeta.value) : event.type}
        </span>
        <span
          className={`inline-flex items-center rounded-medium px-2.5 py-1 text-xs font-medium border ${
            event.status === "PUBLISHED"
              ? "bg-success-50 text-success-700 border-success-200"
              : event.status === "DRAFT"
                ? "bg-warning-50 text-warning-700 border-warning-200"
                : event.status === "CANCELLED"
                  ? "bg-danger-50 text-danger-700 border-danger-200"
                  : "bg-default-100 text-default-700 border-default-200"
          }`}
        >
          {statusMeta ? tStatus(statusMeta.value) : event.status}
        </span>
        {event.isPast && (
          <span className="text-tiny text-default-400 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Bu etkinlik tamamlanmış / geçmiş
            tarihlidir.
          </span>
        )}
      </div>

      {/* Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-medium border border-default-200 bg-content1 shadow-xs flex flex-col gap-2">
          <span className="text-tiny text-default-500 font-medium flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            {tDetail("dateTime")}
          </span>
          <span className="text-small font-semibold text-foreground">
            {formatDateTimeTr(event.startDate, locale)}
          </span>
          {event.endDate && (
            <span className="text-tiny text-default-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {tDetail("endLine", { date: formatDateTimeTr(event.endDate, locale) })}
            </span>
          )}
        </div>

        <div className="p-4 rounded-medium border border-default-200 bg-content1 shadow-xs flex flex-col gap-2">
          <span className="text-tiny text-default-500 font-medium flex items-center gap-1.5">
            {event.isOnline ? (
              <Video className="h-4 w-4 text-primary" />
            ) : (
              <MapPin className="h-4 w-4 text-primary" />
            )}
            Konum / Bağlantı
          </span>
          {event.isOnline ? (
            event.onlineUrl ? (
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noreferrer"
                className="text-small text-primary underline truncate font-medium"
              >
                {event.onlineUrl}
              </a>
            ) : (
              <span className="text-small text-foreground font-medium">
                {tDetail("onlineMeeting")}
              </span>
            )
          ) : (
            <span className="text-small font-semibold text-foreground truncate">
              {event.location || "Fiziksel konum belirtilmemiş"}
            </span>
          )}
        </div>

        <div className="p-4 rounded-medium border border-default-200 bg-content1 shadow-xs flex flex-col gap-2">
          <span className="text-tiny text-default-500 font-medium flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            {tDetail("capacityStatus")}
          </span>
          <div className="flex items-center justify-between text-small font-semibold">
            <span>{event.registeredCount} Kayıtlı Katılımcı</span>
            <span className="text-default-400 text-tiny">
              {event.capacity ? tDetail("capacityCount", { count: event.capacity }) : tDetail("unlimited")}
            </span>
          </div>
          {event.capacity && (
            <div className="w-full bg-default-100 rounded-full h-2 overflow-hidden mt-1">
              <div
                className={`h-full transition-all rounded-full ${
                  capacityRatio >= 100 ? "bg-danger" : "bg-primary"
                }`}
                style={{ width: `${capacityRatio}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Açıklama */}
      {event.description && (
        <div className="p-4 rounded-medium border border-default-200 bg-content1 shadow-xs">
          <h3 className="text-tiny font-semibold uppercase tracking-wider text-default-500 mb-2">
            {tDetail("description")}
          </h3>
          <p className="text-small text-foreground whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* Katılımcı Listesi */}
      <div className="p-5 rounded-medium border border-default-200 bg-content1 shadow-xs">
        <AttendeeList
          eventId={event.id}
          capacity={event.capacity}
          attendees={event.attendees}
        />
      </div>
    </div>
  )
}
