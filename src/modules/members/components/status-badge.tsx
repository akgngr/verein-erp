"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { MemberStatus } from "@prisma/client";

import { MEMBER_STATUS_COLORS } from "../constants";

/** Durum rozeti: Aktif / Pasif / Ayrıldı / Vefat (etiket i18n). */
export function StatusBadge({ status }: { status: MemberStatus }) {
  const t = useTranslations("members");
  return (
    <Chip color={MEMBER_STATUS_COLORS[status]} size="sm" variant="flat">
      {t(`status.${status}`)}
    </Chip>
  );
}
