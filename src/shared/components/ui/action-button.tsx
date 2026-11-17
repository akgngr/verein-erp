"use client";

import { Button } from "@heroui/react";
import type { ReactNode } from "react";

import { actionVariant } from "./action-appearance";
import { cn } from "@/shared/utils";

export function ActionButton({
  children,
  startIcon,
  color = "primary",
  variant = "solid",
  size = "sm",
  className,
  isDisabled,
  isPending,
  isIconOnly = false,
  ariaLabel,
  onPress,
}: {
  children: ReactNode;
  startIcon?: ReactNode;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "ghost" | "shadow";
  size?: "sm" | "md" | "lg";
  className?: string;
  isDisabled?: boolean;
  isPending?: boolean;
  isIconOnly?: boolean;
  ariaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <Button
      size={size}
      variant={actionVariant(color, variant)}
      className={cn("erp-motion-interactive", className)}
      isDisabled={isDisabled}
      isPending={isPending}
      isIconOnly={isIconOnly}
      aria-label={ariaLabel}
      onPress={onPress}
    >
      {startIcon}
      {children}
    </Button>
  );
}
