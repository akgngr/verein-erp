"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { MeetingType } from "@prisma/client";

import { MEETING_TYPE_COLORS } from "../constants";

/** Toplantı türü rozeti (7.1): etiket i18n (meetings.type.*), renk constants. */
export function TypeBadge({ type }: { type: MeetingType }) {
  const t = useTranslations("meetings");
  return (
    <Chip
      size="sm"
      color={statusTone(MEETING_TYPE_COLORS[type])}
      variant={"soft"}
      style={statusStyle(MEETING_TYPE_COLORS[type])}
    >
      {t(`type.${type}`)}
    </Chip>
  );
}
