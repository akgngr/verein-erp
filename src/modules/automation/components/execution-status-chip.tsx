"use client";

import { Chip } from "@heroui/react";

interface ExecutionStatusChipProps {
  status: string;
  label: string;
}

export function ExecutionStatusChip({ status, label }: ExecutionStatusChipProps) {
  const color = status === "SUCCEEDED"
    ? "success"
    : status === "FAILED"
      ? "danger"
      : status === "RUNNING"
        ? "warning"
        : "default";

  return (
    <Chip size="sm" variant="flat" color={color}>
      {label}
    </Chip>
  );
}
