"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { DocumentStatus } from "@prisma/client";
import { STATUS_COLORS } from "../constants";

/** Durum rozeti: Açık / İşlemde / Tamamlandı / Arşivlendi. */
export function StatusBadge({ status }: { status: DocumentStatus }) {
  const t = useTranslations("documents.status");

  return (
    <Chip
      size="sm"
      color={statusTone(STATUS_COLORS[status])}
      variant={"soft"}
      style={statusStyle(STATUS_COLORS[status])}
    >
      {t(status)}
    </Chip>
  );
}
