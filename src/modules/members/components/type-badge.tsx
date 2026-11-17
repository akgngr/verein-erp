"use client";

import type { MembershipType } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { MEMBERSHIP_TYPE_COLORS } from "../constants";

export function TypeBadge({ type }: { type: MembershipType }) {
  const t = useTranslations("members");
  return <StatusChip tone={MEMBERSHIP_TYPE_COLORS[type]}>{t(`type.${type}`)}</StatusChip>;
}
