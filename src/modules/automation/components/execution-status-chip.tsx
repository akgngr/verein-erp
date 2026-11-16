"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { Chip } from "@heroui/react";
import { statusTone } from "@/shared/components/ui/status-appearance";

interface ExecutionStatusChipProps {
  status: string;
  label: string;
}

export function ExecutionStatusChip({
  status,
  label,
}: ExecutionStatusChipProps) {
  const color =
    status === "SUCCEEDED"
      ? "success"
      : status === "FAILED"
        ? "danger"
        : status === "RUNNING"
          ? "warning"
          : "default";

  return (
    <Chip
      size="sm"
      color={statusTone(color)}
      variant={"soft"}
      style={statusStyle(color)}
    >
      {label}
    </Chip>
  );
}
