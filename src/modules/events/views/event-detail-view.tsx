import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Clock, MapPin, Video, ArrowLeft, Users } from "lucide-react"
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
  const event = await getEventById(eventId)

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
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-default-500 hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tüm Etkinliklere Dön
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-default-100 text-default-700 border border-default-200">
                {typeMeta?.labelTr ?? event.type}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border ${
                  statusMeta?.tailwindClass ??
                  "bg-default-100 text-default-700 border-default-200"
                }`}
              >
                {statusMeta?.labelTr ?? event.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-divider bg-background shadow-xs flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            Tarih & Zaman
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatDateTimeTr(event.startDate)}
          </span>
          {event.endDate && (
            <span className="text-xs text-default-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Bitiş: {formatDateTimeTr(event.endDate)}
            </span>
          )}
        </div>

        <div className="p-4 rounded-xl border border-divider bg-background shadow-xs flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium flex items-center gap-1.5">
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
                className="text-xs text-primary underline truncate font-medium"
              >
                {event.onlineUrl}
              </a>
            ) : (
              <span className="text-xs text-foreground font-medium">
                Online Toplantı
              </span>
            )
          ) : (
            <span className="text-xs font-semibold text-foreground">
              {event.location || "Fiziksel konum belirtilmemiş"}
            </span>
          )}
        </div>

        <div className="p-4 rounded-xl border border-divider bg-background shadow-xs flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" />
            Kapasite Durumu
          </span>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>{event.registeredCount} Kayıtlı Katılımcı</span>
            <span className="text-default-400">
              {event.capacity ? `${event.capacity} Kontenjan` : "Sınırsız"}
            </span>
          </div>
          {event.capacity && (
            <div className="w-full bg-default-100 rounded-full h-2 overflow-hidden mt-1">
              <div
                className={`h-full transition-all rounded-full ${
                  capacityRatio >= 100 ? "bg-rose-500" : "bg-primary"
                }`}
                style={{ width: `${capacityRatio}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Açıklama */}
      {event.description && (
        <div className="p-4 rounded-xl border border-divider bg-background shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-default-500 mb-2">
            Etkinlik Açıklaması
          </h3>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* Katılımcı Listesi */}
      <div className="p-5 rounded-xl border border-divider bg-background shadow-xs">
        <AttendeeList
          eventId={event.id}
          capacity={event.capacity}
          attendees={event.attendees}
        />
      </div>
    </div>
  )
}
