"use client";

import { Chip } from "@heroui/react";

import type { DocumentDirection } from "@prisma/client";

import { DIRECTION_COLORS, DIRECTION_LABELS } from "../constants";

/** Yön rozeti: Gelen / Giden. */
export function DirectionBadge({ direction }: { direction: DocumentDirection }) {
  return (
    <Chip color={DIRECTION_COLORS[direction]} size="sm" variant="flat">
      {DIRECTION_LABELS[direction]}
    </Chip>
  );
}
