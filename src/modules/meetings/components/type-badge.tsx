"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { MeetingType } from "@prisma/client";

import { MEETING_TYPE_COLORS } from "../constants";

/** Toplantı türü rozeti (7.1): etiket i18n (meetings.type.*), renk constants. */
export function TypeBadge({ type }: { type: MeetingType }) {
  const t = useTranslations("meetings");
  return (
    <Chip color={MEETING_TYPE_COLORS[type]} size="sm" variant="flat">
      {t(`type.${type}`)}
    </Chip>
  );
}
