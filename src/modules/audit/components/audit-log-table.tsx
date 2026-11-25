"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Dialog } from "@/shared/components/kit";
import { DataTable } from "@/shared/components/data-table/data-table";
import { DateRangeFilter } from "@/shared/components/data-table/date-range-filter";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { StatusChip } from "@/shared/components/ui/status-chip";
import { formatDateTime } from "@/shared/utils";

import { getAuditLogChangesAction } from "../actions/audit-actions";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "../constants";
import type { AuditLogRow } from "../queries/list-audit-logs";

/** #583: Sabit liste ile veritabanındaki değerlerin birleşimi (yeni modüllerin işlemleri de filtrelenebilir). */
function mergeValues(known: readonly string[], found: string[]): string[] {
  return [...new Set([...known, ...found])];
}

/** Denetim kaydı: salt okunur ortak DataTable (11.2). */
export function AuditLogTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  filterValues,
}: {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filterValues?: { actions: string[]; entities: string[] };
}) {
  const t = useTranslations("audit");
  const [detail, setDetail] = useState<{ row: AuditLogRow; before: unknown; after: unknown; error?: string } | null>(null);
  const openDetail = async (row: AuditLogRow) => {
    const response = await getAuditLogChangesAction({ id: row.id });
    setDetail(response.ok ? { row, ...response.data } : { row, before: null, after: null, error: response.error });
  };
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
        <StatusChip tone={actionColor(row.action)}>
          {actionLabel(row.action)}
        </StatusChip>
      ),
    },
    {
      key: "entity",
      label: t("table.entity"),
      render: (row) => entityLabel(row.entity),
    },
    { key: "entityId", label: t("table.entityId") },
    { key: "ip", label: t("table.ip") },
  ];

  return (
    <>
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
          options: mergeValues(AUDIT_ACTIONS, filterValues?.actions ?? []).map((value) => ({
            value,
            label: actionLabel(value),
          })),
        },
        {
          key: "entity",
          label: t("table.entity"),
          options: mergeValues(AUDIT_ENTITIES, filterValues?.entities ?? []).map((value) => ({
            value,
            label: entityLabel(value),
          })),
        },
      ]}
      dateFilter={<DateRangeFilter label={t("table.date")} idPrefix="audit-date" />}
      rowActions={(row) => [{ key: "details", label: t("details.open"), onPress: () => void openDetail(row) }]}
      emptyMessage={t("table.empty")}
    />
    <Dialog isOpen={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)} size="lg" scroll="inside" aria-label={t("details.title")}>
      {detail ? (
        <>
          <Dialog.Header>
            <Dialog.Heading>
              {t("details.title")} · {actionLabel(detail.row.action)} · {entityLabel(detail.row.entity)}
            </Dialog.Heading>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-3 text-sm">
            <p className="text-ink-500">
              {formatDateTime(detail.row.createdAt)} · {detail.row.userLabel ?? "—"} · {detail.row.entityId ?? "—"}
            </p>
            {detail.error ? <p className="text-danger">{detail.error}</p> : null}
            {(["before", "after"] as const).map((key) => (
              <section key={key} className="flex flex-col gap-1">
                <h3 className="font-semibold">{t(`details.${key}`)}</h3>
                {detail[key] === null || detail[key] === undefined ? (
                  <p className="text-ink-500">{t("details.none")}</p>
                ) : (
                  <pre className="max-h-72 overflow-auto rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(detail[key], null, 2)}
                  </pre>
                )}
              </section>
            ))}
          </Dialog.Body>
        </>
      ) : null}
    </Dialog>
    </>
  );
}

function actionColor(
  action: string,
): "success" | "danger" | "warning" | "primary" | "default" {
  if (action === "LOGIN_SUCCESS" || action === "ACTIVATE") return "success";
  if (action === "LOGIN_FAILED") return "danger";
  if (action === "DEACTIVATE" || action === "PASSWORD_RESET") return "warning";
  if (
    action === "CREATE" ||
    action === "UPDATE" ||
    action === "PASSWORD_CHANGE"
  )
    return "primary";
  return "default";
}
