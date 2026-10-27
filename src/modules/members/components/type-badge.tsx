"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";

import type { MembershipType } from "@prisma/client";

import { MEMBERSHIP_TYPE_COLORS } from "../constants";

/** Üyelik türü rozeti: Asıl / Onursal / Fahri / Destekçi (etiket i18n). */
export function TypeBadge({ type }: { type: MembershipType }) {
  const t = useTranslations("members");
  return (
    <Chip color={MEMBERSHIP_TYPE_COLORS[type]} size="sm" variant="flat">
      {t(`type.${type}`)}
    </Chip>
  );
}
