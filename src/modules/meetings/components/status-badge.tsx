"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { MeetingStatus } from "@prisma/client";

import { MEETING_STATUS_COLORS } from "../constants";

/** Toplantı durum rozeti (7.1): etiket i18n (meetings.status.*), renk constants. */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("meetings");
  return (
    <Chip color={MEETING_STATUS_COLORS[status]} size="sm" variant="flat">
      {t(`status.${status}`)}
    </Chip>
  );
}
