"use client";

import { Button, addToast } from "@heroui/react";
import { Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { YearClosingRow } from "../types";
import { YearCloseDialog } from "./year-close-dialog";
import { YearUnlockDialog } from "./year-unlock-dialog";

/** Yıl kapanış tablosu (§ 11.6). */
export function YearClosingTable({
  years,
  canApprove,
}: {
  years: Array<YearClosingRow & { lockedByFormatted?: string | null }>;
  canApprove: boolean;
}) {
  const t = useTranslations("accounting.years");
  const [closeTarget, setCloseTarget] = useState<YearClosingRow | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<YearClosingRow | null>(null);
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  return (
    <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <table className="w-full text-small" aria-label={t("title")}>
        <thead>
          <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
            <th className="py-2 pr-3">{t("colYear")}</th>
            <th className="py-2 pr-3">{t("colBookings")}</th>
            <th className="py-2 pr-3">{t("colIncome")}</th>
            <th className="py-2 pr-3">{t("colExpense")}</th>
            <th className="py-2 pr-3">{t("colMissing")}</th>
            <th className="py-2 pr-3">{t("colStatus")}</th>
            <th className="py-2" aria-label="" />
          </tr>
        </thead>
        <tbody>
          {years.map((row) => (
            <tr key={row.year} className="border-b border-default-100 last:border-none">
              <td className="py-2 pr-3 font-medium">{row.year}</td>
              <td className="py-2 pr-3">{row.bookingCount}</td>
              <td className="py-2 pr-3 text-success">{format(row.incomeCents)}</td>
              <td className="py-2 pr-3 text-danger">{format(row.expenseCents)}</td>
              <td className={`py-2 pr-3 ${row.missingReceiptCount > 0 ? "font-medium text-warning" : ""}`}>
                {row.missingReceiptCount}
              </td>
              <td className="py-2 pr-3">
                {row.lockedAt ? (
                  <span className="text-default-500">
                    {t("locked")}
                    <span className="block text-tiny">{row.lockedByFormatted ?? ""}</span>
                  </span>
                ) : (
                  <span className="text-success">{t("open")}</span>
                )}
              </td>
              <td className="py-2">
                {canApprove ? (
                  <div className="flex justify-end gap-1">
                    {row.lockedAt ? (
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        startContent={<LockOpen className="h-4 w-4" aria-hidden />}
                        onPress={() => setUnlockTarget(row)}
                      >
                        {t("unlock")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<Lock className="h-4 w-4" aria-hidden />}
                        onPress={() => {
                          void addToast;
                          setCloseTarget(row);
                        }}
                      >
                        {t("close")}
                      </Button>
                    )}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <YearCloseDialog
        isOpen={closeTarget !== null}
        onOpenChange={(open) => !open && setCloseTarget(null)}
        year={closeTarget?.year ?? 0}
        preview={{
          bookingCount: closeTarget?.bookingCount ?? 0,
          incomeCents: closeTarget?.incomeCents ?? 0,
          expenseCents: closeTarget?.expenseCents ?? 0,
          missingReceiptCount: closeTarget?.missingReceiptCount ?? 0,
        }}
      />
      <YearUnlockDialog
        isOpen={unlockTarget !== null}
        onOpenChange={(open) => !open && setUnlockTarget(null)}
        year={unlockTarget?.year ?? 0}
      />
    </div>
  );
}
