"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { DocumentStatus } from "@prisma/client";
import { STATUS_COLORS } from "../constants";

/** Durum rozeti: Açık / İşlemde / Tamamlandı / Arşivlendi. */
export function StatusBadge({ status }: { status: DocumentStatus }) {
  const t = useTranslations("documents.status");

  return (
    <Chip color={STATUS_COLORS[status]} size="sm" variant="flat">
      {t(status)}
    </Chip>
  );
}
