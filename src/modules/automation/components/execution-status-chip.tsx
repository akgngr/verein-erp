"use client";

import { StatusChip } from "@/shared/components/ui/status-chip";

interface ExecutionStatusChipProps {
  status: string;
  label: string;
}

export function ExecutionStatusChip({
  status,
  label,
}: ExecutionStatusChipProps) {
  const tone =
    status === "SUCCEEDED"
      ? "success"
      : status === "FAILED"
        ? "danger"
        : status === "RUNNING"
          ? "warning"
          : "default";

  return <StatusChip tone={tone}>{label}</StatusChip>;
}
