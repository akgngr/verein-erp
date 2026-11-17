"use client";

import type { MemberDueStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { MEMBER_DUE_STATUS_COLORS } from "../constants";

export function DuesStatusBadge({ status }: { status: MemberDueStatus }) {
  const t = useTranslations("members.dues");
  return (
    <StatusChip tone={MEMBER_DUE_STATUS_COLORS[status]}>
      {t(`status.${status}`)}
    </StatusChip>
  );
}
