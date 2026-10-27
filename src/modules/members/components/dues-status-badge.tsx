"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { MemberDueStatus } from "@prisma/client";

import { MEMBER_DUE_STATUS_COLORS } from "../constants";

/** Aidat satırı durum rozeti: Açık / Kısmen / Ödendi / Muaf (etiket i18n). */
export function DuesStatusBadge({ status }: { status: MemberDueStatus }) {
  const t = useTranslations("members.dues");
  return (
    <Chip color={MEMBER_DUE_STATUS_COLORS[status]} size="sm" variant="flat">
      {t(`status.${status}`)}
    </Chip>
  );
}
