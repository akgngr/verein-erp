"use client";
import { Card } from "@heroui/react";

import { useTranslations } from "next-intl";

/** Liste istatistik kartları (§ 11.1): gelir/gider/fark/eksik belge. */
export function StatsCards({
  incomeCents,
  expenseCents,
  missingReceiptCount,
}: {
  incomeCents: number;
  expenseCents: number;
  missingReceiptCount: number;
}) {
  const t = useTranslations("accounting.list.stats");
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            {t("income")}
          </p>
          <p className="text-base font-semibold text-success">
            {format(incomeCents)}
          </p>
        </Card.Content>
      </Card>
      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            {t("expense")}
          </p>
          <p className="text-base font-semibold text-danger">
            {format(expenseCents)}
          </p>
        </Card.Content>
      </Card>
      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            {t("net")}
          </p>
          <p
            className={`text-base font-semibold ${incomeCents - expenseCents >= 0 ? "text-success" : "text-danger"}`}
          >
            {format(incomeCents - expenseCents)}
          </p>
        </Card.Content>
      </Card>
      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Content className={["px-4 py-3"].filter(Boolean).join(" ")}>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            {t("missingReceipt")}
          </p>
          <p
            className={`text-base font-semibold ${missingReceiptCount > 0 ? "text-warning" : "text-ink-500"}`}
          >
            {missingReceiptCount}
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
