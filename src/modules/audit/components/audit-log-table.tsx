"use client";

import { Chip } from "@heroui/react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { formatDateTime } from "@/shared/utils";

import { AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS } from "../constants";
import type { AuditLogRow } from "../queries/list-audit-logs";

/** Denetim kaydı: salt okunur ortak DataTable (11.2). */
export function AuditLogTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
}: {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
}) {
  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: "createdAt",
      label: "Tarih",
      sortable: true,
      width: 150,
      render: (row) => formatDateTime(row.createdAt),
    },
    { key: "userLabel", label: "Kullanıcı" },
    {
      key: "action",
      label: "İşlem",
      render: (row) => (
        <Chip size="sm" variant="flat" color={actionColor(row.action)}>
          {AUDIT_ACTION_LABELS[row.action] ?? row.action}
        </Chip>
      ),
    },
    { key: "entity", label: "Varlık", render: (row) => entityLabel(row.entity) },
    { key: "entityId", label: "Varlık ID" },
    { key: "ip", label: "IP" },
  ];

  return (
    <DataTable<AuditLogRow>
      ariaLabel="Denetim kaydı listesi"
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      q={q}
      searchPlaceholder="Kullanıcı veya varlık ID ara..."
      filters={[
        { key: "action", label: "İşlem", options: AUDIT_ACTION_OPTIONS.map((o) => ({ ...o })) },
        { key: "entity", label: "Varlık", options: AUDIT_ENTITY_OPTIONS.map((o) => ({ ...o })) },
      ]}
      emptyMessage="Denetim kaydı bulunamadı."
    />
  );
}

function actionColor(action: string): "success" | "danger" | "warning" | "primary" | "default" {
  if (action === "LOGIN_SUCCESS" || action === "ACTIVATE") return "success";
  if (action === "LOGIN_FAILED") return "danger";
  if (action === "DEACTIVATE" || action === "PASSWORD_RESET") return "warning";
  if (action === "CREATE" || action === "UPDATE" || action === "PASSWORD_CHANGE") return "primary";
  return "default";
}

function entityLabel(entity: string): string {
  if (entity === "User") return "Kullanıcı";
  if (entity === "Auth") return "Oturum";
  return entity;
}
