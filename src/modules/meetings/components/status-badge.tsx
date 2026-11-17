"use client";

import type { MeetingStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { MEETING_STATUS_COLORS } from "../constants";

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("meetings");
  return <StatusChip tone={MEETING_STATUS_COLORS[status]}>{t(`status.${status}`)}</StatusChip>;
}
