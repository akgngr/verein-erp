"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import type { BookingType } from "@prisma/client";

import { useTranslations } from "next-intl";

/** Fiş türü rozeti (§ 11.1): gelir yeşil, gider kırmızı, virman nötr. */
export function BookingTypeBadge({ type }: { type: BookingType }) {
  const t = useTranslations("accounting.form");
  const color =
    type === "INCOME" ? "success" : type === "EXPENSE" ? "danger" : "default";
  return (
    <Chip
      size="sm"
      variant="soft"
      color={statusTone(color)}
      style={statusStyle(color)}
    >
      {type === "INCOME"
        ? t("typeIncome")
        : type === "EXPENSE"
          ? t("typeExpense")
          : t("typeTransfer")}
    </Chip>
  );
}
