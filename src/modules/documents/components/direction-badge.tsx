"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { DocumentDirection } from "@prisma/client";
import { DIRECTION_COLORS } from "../constants";

/** Yön rozeti: Gelen / Giden. */
export function DirectionBadge({
  direction,
}: {
  direction: DocumentDirection;
}) {
  const t = useTranslations("documents.direction");
  const label = direction === "INCOMING" ? t("INCOMING") : t("OUTGOING");

  return (
    <Chip
      size="sm"
      color={statusTone(DIRECTION_COLORS[direction])}
      variant={"soft"}
      style={statusStyle(DIRECTION_COLORS[direction])}
    >
      {label}
    </Chip>
  );
}
