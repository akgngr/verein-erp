"use client";

import type { MeetingStatus, MeetingType } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { MEETING_STATUS_COLORS, MEETING_TYPE_COLORS } from "../constants";

export function TypeBadge({ type }: { type: MeetingType }) {
  const t = useTranslations("meetings.type");
  return <StatusChip tone={MEETING_TYPE_COLORS[type]}>{t(type)}</StatusChip>;
}

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("meetings.status");
  return <StatusChip tone={MEETING_STATUS_COLORS[status]}>{t(status)}</StatusChip>;
}
