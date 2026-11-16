"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { MeetingStatus } from "@prisma/client";

import { MEETING_STATUS_COLORS } from "../constants";

/** Toplantı durum rozeti (7.1): etiket i18n (meetings.status.*), renk constants. */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("meetings");
  return (
    <Chip
      size="sm"
      color={statusTone(MEETING_STATUS_COLORS[status])}
      variant={"soft"}
      style={statusStyle(MEETING_STATUS_COLORS[status])}
    >
      {t(`status.${status}`)}
    </Chip>
  );
}
