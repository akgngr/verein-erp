"use client";

import type { DocumentStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/shared/components/ui/status-chip";
import { STATUS_COLORS } from "../constants";

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const t = useTranslations("documents.status");
  return <StatusChip tone={STATUS_COLORS[status]}>{t(status)}</StatusChip>;
}
