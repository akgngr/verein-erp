"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { formatDateTime } from "@/shared/utils";

import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "../constants";
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
  const t = useTranslations("audit");
  // Bilinmeyen (yeni modüllerin eklediği) değerler ham gösterilir.
  const actionLabel = (action: string) =>
    t.has(`actions.${action}`) ? t(`actions.${action}`) : action;
  const entityLabel = (entity: string) =>
    t.has(`entities.${entity}`) ? t(`entities.${entity}`) : entity;

  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: "createdAt",
      label: t("table.date"),
      sortable: true,
      width: 150,
      render: (row) => formatDateTime(row.createdAt),
    },
    { key: "userLabel", label: t("table.user") },
    {
      key: "action",
      label: t("table.action"),
      render: (row) => (
        <Chip size="sm" variant="flat" color={actionColor(row.action)}>
          {actionLabel(row.action)}
        </Chip>
      ),
    },
    { key: "entity", label: t("table.entity"), render: (row) => entityLabel(row.entity) },
    { key: "entityId", label: t("table.entityId") },
    { key: "ip", label: t("table.ip") },
  ];

  return (
    <DataTable<AuditLogRow>
      ariaLabel={t("table.aria")}
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      sort={sort}
      dir={dir}
      q={q}
      searchPlaceholder={t("table.search")}
      filters={[
        {
          key: "action",
          label: t("table.action"),
          options: AUDIT_ACTIONS.map((value) => ({ value, label: actionLabel(value) })),
        },
        {
          key: "entity",
          label: t("table.entity"),
          options: AUDIT_ENTITIES.map((value) => ({ value, label: entityLabel(value) })),
        },
      ]}
      emptyMessage={t("table.empty")}
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
