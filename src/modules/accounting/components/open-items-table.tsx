import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { OpenItemRow } from "../queries/invoices";
import { AGING_BUCKETS } from "../services/invoice-payments";
import { DunningButton } from "./dunning-button";

const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date) => date.toISOString().slice(0, 10).split("-").reverse().join(".");

/** ACC-3 OPOS: yaşlandırma özeti + açık kalem listesi (vadeye göre). */
export async function OpenItemsTable({ rows, canDun = false }: { rows: OpenItemRow[]; canDun?: boolean }) {
  const t = await getTranslations("accounting.invoices.opos");
  const tDunning = await getTranslations("accounting.dunning");
  const totals = AGING_BUCKETS.map((bucket) => ({ bucket, cents: rows.filter((row) => row.bucket === bucket).reduce((sum, row) => sum + row.openCents, 0) }));
  const total = rows.reduce((sum, row) => sum + row.openCents, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {totals.map((item) => (
          <div key={item.bucket} className={`rounded-medium border p-3 ${item.bucket === "notDue" ? "border-default-200" : item.bucket === "d1_30" ? "border-warning-200" : "border-danger-200"}`}>
            <div className="text-tiny text-default-500">{t(`buckets.${item.bucket}`)}</div>
            <div className="font-semibold tabular-nums">{euro(item.cents)}</div>
          </div>
        ))}
        <div className="rounded-medium bg-default-100 p-3">
          <div className="text-tiny text-default-500">{t("total")}</div>
          <div className="font-semibold tabular-nums">{euro(total)}</div>
        </div>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-medium border border-default-200 bg-content1">
          <table className="w-full text-small">
            <thead className="text-left text-tiny uppercase text-default-500">
              <tr>
                <th className="p-3">{t("number")}</th>
                <th className="p-3">{t("recipient")}</th>
                <th className="p-3">{t("due")}</th>
                <th className="p-3 text-right">{t("days")}</th>
                <th className="p-3 text-right">{t("gross")}</th>
                <th className="p-3 text-right">{t("open")}</th>
                <th className="p-3">{tDunning("column")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-default-100">
                  <td className="p-3">
                    <Link href={`/muhasebe/faturalar/${row.id}`} className="text-primary hover:underline">
                      {row.number}
                    </Link>
                  </td>
                  <td className="p-3">{row.contactNumber ? `${row.contactNumber} · ${row.recipientName}` : row.recipientName}</td>
                  <td className="p-3">{day(row.dueDate)}</td>
                  <td className={`p-3 text-right tabular-nums ${row.daysOverdue > 30 ? "text-danger" : row.daysOverdue > 0 ? "text-warning-600" : ""}`}>{row.daysOverdue || "—"}</td>
                  <td className="p-3 text-right tabular-nums">{euro(row.grossCents)}</td>
                  <td className="p-3 text-right font-semibold tabular-nums">{euro(row.openCents)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.lastDunningLevel ? <span className="text-tiny text-default-500">{tDunning(`levels.${row.lastDunningLevel}`)}</span> : null}
                      {canDun && row.nextDunningLevel ? <DunningButton invoiceId={row.id} level={row.nextDunningLevel} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-small text-default-500">{t("empty")}</p>
      )}
    </div>
  );
}
