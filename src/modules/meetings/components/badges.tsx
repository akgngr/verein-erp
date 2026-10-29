"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { MeetingStatus, MeetingType } from "@prisma/client";

import { MEETING_STATUS_COLORS, MEETING_TYPE_COLORS } from "../constants";

/** Toplantı türü rozeti (7.1). */
export function TypeBadge({ type }: { type: MeetingType }) {
  const t = useTranslations("meetings.type");
  return (
    <Chip size="sm" variant="flat" color={MEETING_TYPE_COLORS[type]}>
      {t(type)}
    </Chip>
  );
}

/** Toplantı durumu rozeti (7.1). */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("meetings.status");
  return (
    <Chip size="sm" variant="flat" color={MEETING_STATUS_COLORS[status]}>
      {t(status)}
    </Chip>
  );
}
