"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { DocumentDirection } from "@prisma/client";
import { DIRECTION_COLORS } from "../constants";

/** Yön rozeti: Gelen / Giden. */
export function DirectionBadge({ direction }: { direction: DocumentDirection }) {
  const t = useTranslations("documents.direction");
  const label = direction === "INCOMING" ? t("INCOMING") : t("OUTGOING");

  return (
    <Chip color={DIRECTION_COLORS[direction]} size="sm" variant="flat">
      {label}
    </Chip>
  );
}
