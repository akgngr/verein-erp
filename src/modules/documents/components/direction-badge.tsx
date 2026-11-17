"use client";

import type { DocumentDirection } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { DIRECTION_COLORS } from "../constants";

export function DirectionBadge({
  direction,
}: {
  direction: DocumentDirection;
}) {
  const t = useTranslations("documents.direction");
  const label = direction === "INCOMING" ? t("INCOMING") : t("OUTGOING");

  return <StatusChip tone={DIRECTION_COLORS[direction]}>{label}</StatusChip>;
}
