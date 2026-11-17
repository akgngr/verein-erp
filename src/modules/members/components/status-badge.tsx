"use client";

import type { MemberStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { MEMBER_STATUS_COLORS } from "../constants";

export function StatusBadge({ status }: { status: MemberStatus }) {
  const t = useTranslations("members");
  return <StatusChip tone={MEMBER_STATUS_COLORS[status]}>{t(`status.${status}`)}</StatusChip>;
}
