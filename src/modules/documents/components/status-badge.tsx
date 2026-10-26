"use client";

import { Chip } from "@heroui/react";

import type { DocumentStatus } from "@prisma/client";

import { STATUS_COLORS, STATUS_LABELS } from "../constants";

/** Durum rozeti: Açık / İşlemde / Tamamlandı / Arşivlendi. */
export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Chip color={STATUS_COLORS[status]} size="sm" variant="flat">
      {STATUS_LABELS[status]}
    </Chip>
  );
}
