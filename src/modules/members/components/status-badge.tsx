"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { MemberStatus } from "@prisma/client";

import { MEMBER_STATUS_COLORS } from "../constants";

/** Durum rozeti: Aktif / Pasif / Ayrıldı / Vefat (etiket i18n). */
export function StatusBadge({ status }: { status: MemberStatus }) {
  const t = useTranslations("members");
  return (
    <Chip
      size="sm"
      color={statusTone(MEMBER_STATUS_COLORS[status])}
      variant={"soft"}
      style={statusStyle(MEMBER_STATUS_COLORS[status])}
    >
      {t(`status.${status}`)}
    </Chip>
  );
}
