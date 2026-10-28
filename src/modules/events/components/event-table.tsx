"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@heroui/react"
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react"
import { DataTablePagination } from "@/shared/components/data-table"
import type { EventRow } from "../types"
import { EVENT_TYPES, EVENT_STATUSES } from "../constants"
import { deleteEventAction } from "../actions/event-actions"
import { formatDateTimeTr } from "../helpers/event-helpers"
import { EventFormModal } from "./event-form-modal"

interface EventTableProps {
  items: EventRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function EventTable({
  items,
  total,
  page,
  pageSize,
  totalPages,
}: EventTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(newPage))
    router.push(`/events?${params.toString()}`)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("pageSize", String(newPageSize))
    params.set("page", "1")
    router.push(`/events?${params.toString()}`)
  }

  const handleDelete = async (id: string, title: string) => {
    if (
      !window.confirm(
        `"${title}" başlıklı etkinliği silmek istediğinize emin misiniz?`,
      )
    ) {
      return
    }

    setDeletingId(id)
    try {
      await deleteEventAction(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-divider bg-background shadow-xs">
        <table className="w-full text-left text-xs text-foreground">
          <thead className="bg-default-50 text-default-600 font-semibold uppercase tracking-wider text-[11px] border-b border-divider">
            <tr>
              <th className="py-3 px-4">Etkinlik</th>
              <th className="py-3 px-4">Tür & Durum</th>
              <th className="py-3 px-4">Tarih & Saat</th>
              <th className="py-3 px-4">Konum</th>
              <th className="py-3 px-4">Katılımcı / Kontenjan</th>
              <th className="py-3 px-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider font-medium">
            {items.map((event) => {
              const typeMeta = EVENT_TYPES.find((t) => t.value === event.type)
              const statusMeta = EVENT_STATUSES.find(
                (s) => s.value === event.status,
              )

              return (
                <tr
                  key={event.id}
                  className="transition-colors hover:bg-default-50/50 group"
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <Link
                        href={`/events?detail=${event.id}`}
                        className="font-semibold text-sm text-foreground hover:text-primary transition-colors inline-block"
                      >
                        {event.title}
                      </Link>
                      {event.description && (
                        <span className="text-[11px] text-default-400 line-clamp-1 max-w-xs mt-0.5 font-normal">
                          {event.description}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-default-100 text-default-700 border border-default-200">
                        {typeMeta?.labelTr ?? event.type}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                          statusMeta?.tailwindClass ??
                          "bg-default-100 text-default-700 border-default-200"
                        }`}
                      >
                        {statusMeta?.labelTr ?? event.status}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5 text-default-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-default-400" />
                        <span>{formatDateTimeTr(event.startDate)}</span>
                      </div>
                      {event.isPast && (
                        <span className="text-[10px] text-default-400 font-normal flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Geçmiş etkinlik
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {event.isOnline ? (
                      <div className="flex items-center gap-1.5 text-primary text-xs">
                        <Video className="h-3.5 w-3.5" />
                        <span>Online Etkinlik</span>
                      </div>
                    ) : event.location ? (
                      <div className="flex items-center gap-1.5 text-default-600 max-w-[200px] truncate">
                        <MapPin className="h-3.5 w-3.5 text-default-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    ) : (
                      <span className="text-default-400 italic">
                        Belirtilmedi
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-default-400" />
                      <span className="font-semibold">
                        {event.registeredCount}
                      </span>
                      <span className="text-default-400">/</span>
                      <span className="text-default-500">
                        {event.capacity ? `${event.capacity} kişi` : "Sınırsız"}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        as={Link}
                        href={`/events?detail=${event.id}`}
                        size="sm"
                        variant="light"
                        isIconOnly
                        aria-label="Detay"
                      >
                        <Eye className="h-4 w-4 text-default-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        aria-label="Düzenle"
                        onPress={() => setEditingEvent(event)}
                      >
                        <Edit2 className="h-4 w-4 text-default-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isIconOnly
                        aria-label="Sil"
                        isLoading={deletingId === event.id}
                        onPress={() => handleDelete(event.id, event.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {editingEvent && (
        <EventFormModal
          isOpen={Boolean(editingEvent)}
          onClose={() => setEditingEvent(null)}
          eventToEdit={editingEvent}
        />
      )}
    </div>
  )
}
