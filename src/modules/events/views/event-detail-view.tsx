"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ArrowLeft,
  Users,
} from "lucide-react";
import { Chip, Progress } from "@heroui/react";
import { getEventById } from "../queries/get-event";
import { AttendeeList } from "../components/attendee-list";
import { EVENT_TYPES, EVENT_STATUSES } from "../constants";

interface EventDetailViewProps {
  eventId: string;
}

export async function EventDetailView({ eventId }: EventDetailViewProps) {
  const event = await getEventById(eventId);

  if (!event) {
    notFound();
  }

  const typeMeta = EVENT_TYPES.find((t) => t.value === event.type);
  const statusMeta = EVENT_STATUSES.find((s) => s.value === event.status);

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const capacityRatio = event.capacity
    ? Math.min(100, Math.round((event.registeredCount / event.capacity) * 100))
    : 0;

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
            <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Chip size="sm" variant="flat">
                {typeMeta?.labelTr ?? event.type}
              </Chip>
              <Chip size="sm" variant="dot" color={statusMeta?.variant ?? "default"}>
                {statusMeta?.labelTr ?? event.status}
              </Chip>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-divider bg-background shadow-xs flex flex-col gap-2">
          <span className="text-xs text-default-500 font-medium flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            Tarih & Zaman
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatDateTime(event.startDate)}
          </span>
          {event.endDate && (
            <span className="text-xs text-default-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Bitiş: {formatDateTime(event.endDate)}
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
              <span className="text-xs text-foreground font-medium">Online Toplantı</span>
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
            <Progress
              size="sm"
              value={capacityRatio}
              color={capacityRatio >= 100 ? "danger" : "primary"}
              aria-label="Kapasite doluluğu"
            />
          )}
        </div>
      </div>

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

      <div className="p-5 rounded-xl border border-divider bg-background shadow-xs">
        <AttendeeList
          eventId={event.id}
          capacity={event.capacity}
          attendees={event.attendees}
        />
      </div>
    </div>
  );
}
