"use client";

import { notify } from "@/shared/components/ui/notify";

import { StatusChip } from "@/shared/components/kit";

import { useTranslations, useLocale } from "next-intl";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
} from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { EventRow } from "../types";
import { EVENT_TYPES, EVENT_STATUSES } from "../constants";
import { deleteEventAction } from "../actions/event-actions";
import { formatDateTimeTr } from "../helpers/event-helpers";
import { EventFormModal } from "./event-form-modal";

interface EventTableProps {
  items: EventRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function EventTable({
  items,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  canUpdate = false,
  canDelete = false,
}: EventTableProps) {
  const tEvents = useTranslations("events");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("events.status");
  const tTypes = useTranslations("events.types");
  const tTable = useTranslations("events.table");
  const locale = useLocale();
  const router = useRouter();
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventRow | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;
    const res = await deleteEventAction(deletingEvent.id);
    if (res.ok) {
      notify.success(tTable("deletedToast", { title: deletingEvent.title }));
      setDeletingEvent(null);
      router.refresh();
    } else {
      notify.error(res.error || tTable("deleteFailed"));
    }
  };

  const columns: DataTableColumn<EventRow>[] = [
    {
      key: "title",
      label: tTable("event"),
      sortable: true,
      render: (row) => (
        <div className="flex flex-col py-1">
          <Link
            href={`/events?detail=${row.id}`}
            className="font-semibold text-sm text-foreground hover:text-accent transition-colors"
          >
            {row.title}
          </Link>
          {row.description && (
            <span className="text-xs text-ink-400 line-clamp-1 max-w-sm mt-0.5">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: tTable("type"),
      sortable: true,
      width: 140,
      render: (row) => {
        const typeMeta = EVENT_TYPES.find((t) => t.value === row.type);
        return (
          <StatusChip tone="default">
            {typeMeta ? tTypes(typeMeta.value) : row.type}
          </StatusChip>
        );
      },
    },
    {
      key: "status",
      label: tTable("status"),
      sortable: true,
      width: 140,
      render: (row) => {
        const statusColorMap: Record<
          string,
          "success" | "warning" | "default" | "danger"
        > = {
          PUBLISHED: "success",
          DRAFT: "warning",
          COMPLETED: "default",
          CANCELLED: "danger",
        };
        const statusMeta = EVENT_STATUSES.find((s) => s.value === row.status);
        return (
          <StatusChip tone={statusColorMap[row.status] ?? "default"}
          >
            <span
              aria-hidden
              className="mr-1.5 size-1.5 rounded-full bg-current"
            />
            {statusMeta ? tStatus(statusMeta.value) : row.status}
          </StatusChip>
        );
      },
    },
    {
      key: "startDate",
      label: tTable("dateTime"),
      sortable: true,
      width: 180,
      render: (row) => (
        <div className="flex flex-col text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 text-ink-400" />
            <span>{formatDateTimeTr(row.startDate, locale)}</span>
          </div>
          {row.isPast && (
            <span className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" /> Geçmiş etkinlik
            </span>
          )}
        </div>
      ),
    },
    {
      key: "location",
      label: tTable("location"),
      render: (row) =>
        row.isOnline ? (
          <div className="flex items-center gap-1.5 text-accent text-sm">
            <Video className="h-3.5 w-3.5" />
            <span>{tTable("online")}</span>
          </div>
        ) : row.location ? (
          <div className="flex items-center gap-1.5 text-ink-600 max-w-[200px] truncate text-sm">
            <MapPin className="h-3.5 w-3.5 text-ink-400 shrink-0" />
            <span className="truncate">{row.location}</span>
          </div>
        ) : (
          <span className="text-ink-400 text-sm italic">
            {tTable("notSpecified")}
          </span>
        ),
    },
    {
      key: "capacity",
      label: tTable("attendeesCapacity"),
      width: 160,
      render: (row) => (
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-3.5 w-3.5 text-ink-400" />
          <span className="font-semibold">{row.registeredCount}</span>
          <span className="text-ink-400">/</span>
          <span className="text-ink-500">
            {row.capacity
              ? tTable("capacityPeople", { count: row.capacity })
              : tTable("unlimited")}
          </span>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "type",
      label: tTable("type"),
      options: EVENT_TYPES.map((type) => ({
        value: type.value,
        label: tTypes(type.value),
      })),
    },
    {
      key: "status",
      label: tTable("status"),
      options: EVENT_STATUSES.map((status) => ({
        value: status.value,
        label: tStatus(status.value),
      })),
    },
    {
      key: "timeFilter",
      label: tTable("time"),
      options: [
        { value: "all", label: tTable("allTime") },
        { value: "upcoming", label: tTable("upcoming") },
        { value: "past", label: tTable("past") },
      ],
    },
  ];

  return (
    <>
      <DataTable<EventRow>
        columns={columns}
        rows={items}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={tTable("search")}
        filters={filters}
        rowActions={(row) => [
          {
            key: "detail",
            label: tTable("viewDetails"),
            icon: <Eye className="h-4 w-4" />,
            href: `/events?detail=${row.id}`,
          },
          ...(canUpdate
            ? [{
                key: "edit",
                label: tCommon("edit"),
                icon: <Pencil className="h-4 w-4" />,
                onPress: () => setEditingEvent(row),
              }]
            : []),
          ...(canDelete
            ? [{
                key: "delete",
                label: tCommon("delete"),
                icon: <Trash2 className="h-4 w-4" />,
                color: "danger" as const,
                onPress: () => setDeletingEvent(row),
              }]
            : []),
        ]}
        emptyMessage={tTable("empty")}
        ariaLabel="Etkinlikler tablosu"
      />

      {editingEvent && (
        <EventFormModal
          isOpen={Boolean(editingEvent)}
          onClose={() => setEditingEvent(null)}
          eventToEdit={editingEvent}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingEvent)}
        onOpenChange={(open) => !open && setDeletingEvent(null)}
        title={tEvents("deleteEvent")}
        message={tTable("deleteMessage", { title: deletingEvent?.title ?? "" })}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
