"use client";

import { Card, CardBody } from "@heroui/react";
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
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card shadow="sm">
        <CardBody className="px-4 py-3">
          <p className="text-tiny uppercase tracking-wide text-default-400">{t("income")}</p>
          <p className="text-medium font-semibold text-success">{format(incomeCents)}</p>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardBody className="px-4 py-3">
          <p className="text-tiny uppercase tracking-wide text-default-400">{t("expense")}</p>
          <p className="text-medium font-semibold text-danger">{format(expenseCents)}</p>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardBody className="px-4 py-3">
          <p className="text-tiny uppercase tracking-wide text-default-400">{t("net")}</p>
          <p
            className={`text-medium font-semibold ${incomeCents - expenseCents >= 0 ? "text-success" : "text-danger"}`}
          >
            {format(incomeCents - expenseCents)}
          </p>
        </CardBody>
      </Card>
      <Card shadow="sm">
        <CardBody className="px-4 py-3">
          <p className="text-tiny uppercase tracking-wide text-default-400">{t("missingReceipt")}</p>
          <p className={`text-medium font-semibold ${missingReceiptCount > 0 ? "text-warning" : "text-default-500"}`}>
            {missingReceiptCount}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
