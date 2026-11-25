import { getLocale, getTranslations } from "next-intl/server";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ArrowLeft,
  Users,
  FileSpreadsheet,
  Megaphone,
} from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/shared/components/ui/page-header";
import { LinkButton } from "@/shared/components/ui/link-button";
import { getCurrentUser } from "@/modules/auth/server";
import { campaignShortcutHref } from "@/modules/mailings/server";
import { getEventById } from "../queries/get-event";
import { eventLabel } from "../recipients";
import { AttendeeList } from "../components/attendee-list";
import { EVENT_TYPES, EVENT_STATUSES } from "../constants";
import {
  calculateCapacityRatio,
  formatDateTimeTr,
} from "../helpers/event-helpers";

interface EventDetailViewProps {
  eventId: string;
}

export async function EventDetailView({ eventId }: EventDetailViewProps) {
  const tStatus = await getTranslations("events.status");
  const tTypes = await getTranslations("events.types");
  const tDetail = await getTranslations("events.detailView");
  const tEvents = await getTranslations("events");
  const event = await getEventById(eventId);
  const locale = await getLocale();

  if (!event) {
    notFound();
  }

  // Kampanyalar etkin ve yetki varsa: katılımcılara duyuru sihirbazı bu etkinlikle açılır.
  const user = await getCurrentUser();
  const announceHref = user
    ? await campaignShortcutHref(user.role, "events:attendees", {
        event: eventLabel(event),
      })
    : null;

  const typeMeta = EVENT_TYPES.find((t) => t.value === event.type);
  const statusMeta = EVENT_STATUSES.find((s) => s.value === event.status);
  const capacityRatio = calculateCapacityRatio(
    event.registeredCount,
    event.capacity,
  );

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
              {announceHref ? (
                <LinkButton
                  href={announceHref}
                  color="default"
                  variant="bordered"
                  startIcon={<Megaphone className="h-4 w-4" />}
                >
                  {tEvents("announce")}
                </LinkButton>
              ) : null}
              <a
                href="/api/events/export"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-300 bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-ink-100 shadow-xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-success" />
                {tEvents("export.button")}
              </a>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 -mt-4 mb-2">
        <span className="inline-flex items-center rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-medium text-foreground">
          {typeMeta ? tTypes(typeMeta.value) : event.type}
        </span>
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium border ${
            event.status === "PUBLISHED"
              ? "bg-success-50 text-success-700 border-success-200"
              : event.status === "DRAFT"
                ? "bg-warning-50 text-warning-700 border-warning-200"
                : event.status === "CANCELLED"
                  ? "bg-danger-50 text-danger-700 border-danger-200"
                  : "bg-ink-100 text-ink-700 border-ink-200"
          }`}
        >
          {statusMeta ? tStatus(statusMeta.value) : event.status}
        </span>
        {event.isPast && (
          <span className="text-xs text-ink-400 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Bu etkinlik tamamlanmış / geçmiş
            tarihlidir.
          </span>
        )}
      </div>

      {/* Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-ink-200 bg-surface shadow-xs flex flex-col gap-2">
          <span className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-accent" />
            {tDetail("dateTime")}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatDateTimeTr(event.startDate, locale)}
          </span>
          {event.endDate && (
            <span className="text-xs text-ink-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {tDetail("endLine", {
                date: formatDateTimeTr(event.endDate, locale),
              })}
            </span>
          )}
        </div>

        <div className="p-4 rounded-lg border border-ink-200 bg-surface shadow-xs flex flex-col gap-2">
          <span className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            {event.isOnline ? (
              <Video className="h-4 w-4 text-accent" />
            ) : (
              <MapPin className="h-4 w-4 text-accent" />
            )}
            Konum / Bağlantı
          </span>
          {event.isOnline ? (
            event.onlineUrl && /^https?:\/\//i.test(event.onlineUrl) ? (
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent underline truncate font-medium"
              >
                {event.onlineUrl}
              </a>
            ) : (
              <span className="text-sm text-foreground font-medium">
                {tDetail("onlineMeeting")}
              </span>
            )
          ) : (
            <span className="text-sm font-semibold text-foreground truncate">
              {event.location || "Fiziksel konum belirtilmemiş"}
            </span>
          )}
        </div>

        <div className="p-4 rounded-lg border border-ink-200 bg-surface shadow-xs flex flex-col gap-2">
          <span className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
            <Users className="h-4 w-4 text-accent" />
            {tDetail("capacityStatus")}
          </span>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{event.registeredCount} Kayıtlı Katılımcı</span>
            <span className="text-ink-400 text-xs">
              {event.capacity
                ? tDetail("capacityCount", { count: event.capacity })
                : tDetail("unlimited")}
            </span>
          </div>
          {event.capacity && (
            <div className="w-full bg-ink-100 rounded-full h-2 overflow-hidden mt-1">
              <div
                className={`h-full transition-all rounded-full ${
                  capacityRatio >= 100 ? "bg-danger" : "bg-accent"
                }`}
                style={{ width: `${capacityRatio}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Açıklama */}
      {event.description && (
        <div className="p-4 rounded-lg border border-ink-200 bg-surface shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
            {tDetail("description")}
          </h3>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* Katılımcı Listesi */}
      <div className="p-5 rounded-lg border border-ink-200 bg-surface shadow-xs">
        <AttendeeList
          eventId={event.id}
          capacity={event.capacity}
          attendees={event.attendees}
        />
      </div>
    </div>
  );
}
