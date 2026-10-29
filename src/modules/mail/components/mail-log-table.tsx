"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DataTable, type DataTableProps } from "@/shared/components/data-table";
import { MAIL_LOG_STATUS_LABEL_KEYS, MAIL_LOG_STATUSES } from "../constants";
import { formatDateTime, getLogStatusBadgeClass } from "../helpers/mail-helpers";
import type { MailLogFilters, MailLogListResult, MailLogRow } from "../types";

type MailLogTableProps = DataTableProps<MailLogRow>;

interface MailLogTableComponentProps {
  result: MailLogListResult;
  filters: MailLogFilters;
  modules: string[];
  locale: string;
}

export function MailLogTable({ result, filters, modules, locale }: MailLogTableComponentProps) {
  const t = useTranslations("mail");

  const columns = useMemo<MailLogTableProps["columns"]>(
    () => [
      {
        key: "createdAt",
        label: t("logs.columns.createdAt"),
        sortable: true,
        render: (row) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDateTime(row.createdAt, locale)}
          </span>
        ),
      },
      {
        key: "toAddress",
        label: t("logs.columns.to"),
        sortable: true,
        render: (row) => (
          <div className="flex flex-col">
            {row.toName ? <span className="font-medium text-foreground">{row.toName}</span> : null}
            <span className={row.toName ? "text-tiny text-default-500" : "text-foreground"}>
              {row.toAddress}
            </span>
          </div>
        ),
      },
      {
        key: "subject",
        label: t("logs.columns.subject"),
        sortable: true,
        render: (row) => <span className="line-clamp-2">{row.subject}</span>,
      },
      {
        key: "module",
        label: t("logs.columns.module"),
        sortable: true,
        render: (row) => <code className="text-tiny text-default-600">{row.module}</code>,
      },
      {
        key: "status",
        label: t("logs.columns.status"),
        sortable: true,
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getLogStatusBadgeClass(row.status)}`}
          >
            {t(MAIL_LOG_STATUS_LABEL_KEYS[row.status])}
          </span>
        ),
      },
      {
        key: "error",
        label: t("logs.columns.error"),
        render: (row) =>
          row.error ? (
            <span className="line-clamp-2 break-all text-tiny text-danger" title={row.error}>
              {row.error}
            </span>
          ) : (
            "—"
          ),
      },
    ],
    [locale, t],
  );

  const tableFilters = useMemo<NonNullable<MailLogTableProps["filters"]>>(
    () => [
      {
        key: "status",
        label: t("logs.columns.status"),
        options: MAIL_LOG_STATUSES.map((status) => ({
          value: status,
          label: t(MAIL_LOG_STATUS_LABEL_KEYS[status]),
        })),
      },
      {
        key: "module",
        label: t("logs.columns.module"),
        options: modules.map((moduleName) => ({ value: moduleName, label: moduleName })),
      },
    ],
    [modules, t],
  );

  return (
    <DataTable
      columns={columns}
      rows={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      sort={filters.requestedSort ?? undefined}
      dir={filters.requestedDirection ?? undefined}
      q={filters.search}
      searchPlaceholder={t("placeholders.logSearch")}
      filters={tableFilters}
      emptyMessage={t("logs.empty")}
      ariaLabel={t("logs.title")}
    />
  );
}
