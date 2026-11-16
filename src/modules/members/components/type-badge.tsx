"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useTranslations } from "next-intl";

import type { MembershipType } from "@prisma/client";

import { MEMBERSHIP_TYPE_COLORS } from "../constants";

/** Üyelik türü rozeti: Asıl / Onursal / Fahri / Destekçi (etiket i18n). */
export function TypeBadge({ type }: { type: MembershipType }) {
  const t = useTranslations("members");
  return (
    <Chip
      size="sm"
      color={statusTone(MEMBERSHIP_TYPE_COLORS[type])}
      variant={"soft"}
      style={statusStyle(MEMBERSHIP_TYPE_COLORS[type])}
    >
      {t(`type.${type}`)}
    </Chip>
  );
}
