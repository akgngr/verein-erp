"use client";

import { Chip } from "@heroui/react";
import type { ReactNode } from "react";

import type { ActionTone } from "./action-appearance";
import { statusStyle, statusTone } from "./status-appearance";

export function StatusChip({
  tone = "default",
  children,
  className,
}: {
  tone?: ActionTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Chip
      size="sm"
      color={statusTone(tone)}
      variant="soft"
      style={statusStyle(tone)}
      className={className}
    >
      {children}
    </Chip>
  );
}
