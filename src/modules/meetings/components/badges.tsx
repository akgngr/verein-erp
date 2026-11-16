"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { MeetingStatus, MeetingType } from "@prisma/client";

import { MEETING_STATUS_COLORS, MEETING_TYPE_COLORS } from "../constants";

/** Toplantı türü rozeti (7.1). */
export function TypeBadge({ type }: { type: MeetingType }) {
  const t = useTranslations("meetings.type");
  return (
    <Chip
      size="sm"
      color={statusTone(MEETING_TYPE_COLORS[type])}
      variant={"soft"}
      style={statusStyle(MEETING_TYPE_COLORS[type])}
    >
      {t(type)}
    </Chip>
  );
}

/** Toplantı durumu rozeti (7.1). */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("meetings.status");
  return (
    <Chip
      size="sm"
      color={statusTone(MEETING_STATUS_COLORS[status])}
      variant={"soft"}
      style={statusStyle(MEETING_STATUS_COLORS[status])}
    >
      {t(status)}
    </Chip>
  );
}
