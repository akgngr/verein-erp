"use client";

import { Chip } from "@heroui/react";
import type { ReactNode } from "react";

import type { ActionTone } from "./action-appearance";
import { statusStyle, statusTone } from "./status-appearance";

export function StatusChip({
  tone = "default",
  children,
  className,
  onClick,
}: {
  tone?: ActionTone;
  children: ReactNode;
  className?: string;
  /** Optional click handler for chips used as filters/toggles. */
  onClick?: () => void;
}) {
  return (
    <Chip
      size="sm"
      color={statusTone(tone)}
      variant="soft"
      style={statusStyle(tone)}
      className={className}
      onClick={onClick}
    >
      {children}
    </Chip>
  );
}
