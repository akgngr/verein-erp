"use client";

import type { MeetingType } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { MEETING_TYPE_COLORS } from "../constants";

export function TypeBadge({ type }: { type: MeetingType }) {
  const t = useTranslations("meetings");
  return <StatusChip tone={MEETING_TYPE_COLORS[type]}>{t(`type.${type}`)}</StatusChip>;
}
