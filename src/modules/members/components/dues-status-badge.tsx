"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { MemberDueStatus } from "@prisma/client";

import { MEMBER_DUE_STATUS_COLORS } from "../constants";

/** Aidat satırı durum rozeti: Açık / Kısmen / Ödendi / Muaf (etiket i18n). */
export function DuesStatusBadge({ status }: { status: MemberDueStatus }) {
  const t = useTranslations("members.dues");
  return (
    <Chip
      size="sm"
      color={statusTone(MEMBER_DUE_STATUS_COLORS[status])}
      variant={"soft"}
      style={statusStyle(MEMBER_DUE_STATUS_COLORS[status])}
    >
      {t(`status.${status}`)}
    </Chip>
  );
}
