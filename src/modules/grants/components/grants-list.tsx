"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { HandCoins, Plus } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import { FormDrawerButton } from "@/shared/components/forms/form-drawer";

import type { GRANT_STATUSES } from "./grant-form";

type Row = {
  id: string;
  name: string;
  funder: string;
  fileNumber: string | null;
  status: (typeof GRANT_STATUSES)[number];
  approvedCents: number | null;
  periodStart: string;
  periodEnd: string;
  reportDueAt: string | null;
  receivedCents: number;
  reportSubmittedAt: string | null;
};
const COLOR = {
  PLANNED: "default",
  APPLIED: "secondary",
  APPROVED: "primary",
  ACTIVE: "primary",
  REPORTED: "success",
  CLOSED: "default",
  REJECTED: "danger",
} as const;

export function GrantsList({
  rows,
  canCreate,
  today,
}: {
  rows: Row[];
  canCreate: boolean;
  today: string;
}) {
  const t = useTranslations("grants");
  const format = useFormatter();
  const money = (cents: number | null) =>
    cents === null
      ? "—"
      : format.number(cents / 100, { style: "currency", currency: "EUR" });
  const date = (value: string | null) =>
    value
      ? format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" })
      : "—";
  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        <div>
          <FormDrawerButton
            param="yeni"
            startIcon={<Plus className="size-4" />}
          >
            {t("newGrant")}
          </FormDrawerButton>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-300 p-10 text-center text-ink-500">
          <HandCoins className="size-8" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500">
              <tr>
                {(
                  [
                    "name",
                    "funder",
                    "period",
                    "approved",
                    "received",
                    "reportDue",
                    "status",
                  ] as const
                ).map((key) => (
                  <th key={key} className="px-3 py-2 text-start font-medium">
                    {t(`columns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const overdue =
                  row.reportDueAt &&
                  !row.reportSubmittedAt &&
                  row.reportDueAt < today;
                return (
                  <tr key={row.id} className="border-t border-ink-100">
                    <td className="px-3 py-2">
                      <Link
                        className="font-medium text-accent hover:underline"
                        href={`/muhasebe/hibeler/${row.id}`}
                      >
                        {row.name}
                      </Link>
                      {row.fileNumber ? (
                        <span className="block text-xs text-ink-500">
                          {row.fileNumber}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{row.funder}</td>
                    <td className="px-3 py-2 text-ink-600">
                      {date(row.periodStart)} – {date(row.periodEnd)}
                    </td>
                    <td className="px-3 py-2">{money(row.approvedCents)}</td>
                    <td className="px-3 py-2">{money(row.receivedCents)}</td>
                    <td
                      className={`px-3 py-2 ${overdue ? "font-medium text-danger" : ""}`}
                    >
                      {row.reportSubmittedAt
                        ? t("submitted")
                        : date(row.reportDueAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Chip
                        size="sm"
                        color={statusTone(COLOR[row.status])}
                        variant={"soft"}
                        style={statusStyle(COLOR[row.status])}
                      >
                        {t(`status.${row.status}`)}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
