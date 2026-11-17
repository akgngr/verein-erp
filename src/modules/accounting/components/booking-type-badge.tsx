"use client";

import type { BookingType } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";

export function BookingTypeBadge({ type }: { type: BookingType }) {
  const t = useTranslations("accounting.form");
  const tone =
    type === "INCOME" ? "success" : type === "EXPENSE" ? "danger" : "default";

  return (
    <StatusChip tone={tone}>
      {type === "INCOME"
        ? t("typeIncome")
        : type === "EXPENSE"
          ? t("typeExpense")
          : t("typeTransfer")}
    </StatusChip>
  );
}
