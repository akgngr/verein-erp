"use client";

import { Badge } from "@heroui/react";

import type { BookingType } from "@prisma/client";

import { useTranslations } from "next-intl";

/** Fiş türü rozeti (§ 11.1): gelir yeşil, gider kırmızı, virman nötr. */
export function BookingTypeBadge({ type }: { type: BookingType }) {
  const t = useTranslations("accounting.form");
  const color = type === "INCOME" ? "success" : type === "EXPENSE" ? "danger" : "default";
  return (
    <Badge color={color} variant="flat" size="sm">
      {type === "INCOME" ? t("typeIncome") : type === "EXPENSE" ? t("typeExpense") : t("typeTransfer")}
    </Badge>
  );
}
