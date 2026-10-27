"use client";

import { Chip } from "@heroui/react";

import type { MeetingStatus, MeetingType } from "@prisma/client";

import { MEETING_STATUS_COLORS, MEETING_STATUS_LABELS, MEETING_TYPE_COLORS, MEETING_TYPE_LABELS } from "../constants";

/** Toplantı türü rozeti (7.1). */
export function TypeBadge({ type }: { type: MeetingType }) {
  return (
    <Chip size="sm" variant="flat" color={MEETING_TYPE_COLORS[type]}>
      {MEETING_TYPE_LABELS[type]}
    </Chip>
  );
}

/** Toplantı durumu rozeti (7.1). */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <Chip size="sm" variant="flat" color={MEETING_STATUS_COLORS[status]}>
      {MEETING_STATUS_LABELS[status]}
    </Chip>
  );
}
