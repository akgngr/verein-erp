"use client";

import { Button } from "@heroui/react";
import type { ReactNode } from "react";

import { actionVariant, type ActionPresentation, type ActionTone } from "./action-appearance";
import { cn } from "@/shared/utils";

/** ERP-owned semantic action intent, independent of HeroUI variant names. */
export type ActionButtonTone = "primary" | "neutral" | "danger" | "success" | "warning";
export type ActionButtonEmphasis = "high" | "medium" | "low";

export type ActionButtonProps = {
  children: ReactNode;
  /** ERP semantic intent. Takes precedence over deprecated color. */
  tone?: ActionButtonTone;
  /** ERP visual hierarchy. Takes precedence over deprecated variant. */
  emphasis?: ActionButtonEmphasis;
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
  pending?: boolean;
  iconOnly?: boolean;
  label?: string;
  onClick?: () => void;
  /** @deprecated Use icon. Remove after W2 migration. */
  startIcon?: ReactNode;
  /** @deprecated Use tone. Remove after W2 migration. */
  color?: ActionTone;
  /** @deprecated Use emphasis. Remove after W2 migration. */
  variant?: ActionPresentation;
  /** @deprecated Use disabled. Remove after W2 migration. */
  isDisabled?: boolean;
  /** @deprecated Use pending. Remove after W2 migration. */
  isPending?: boolean;
  /** @deprecated Use iconOnly. Remove after W2 migration. */
  isIconOnly?: boolean;
  /** @deprecated Use label. Remove after W2 migration. */
  ariaLabel?: string;
  /** @deprecated Use onClick. Remove after W2 migration. */
  onPress?: () => void;
};

const warned = new Set<string>();
function deprecated(prop: string) {
  if (process.env.NODE_ENV !== "development" || warned.has(prop)) return;
  warned.add(prop);
  console.warn(`[ERP UI] ActionButton.${prop} is deprecated; use ERP semantic props instead (W2).`);
}

const toneMap: Record<ActionButtonTone, ActionTone> = {
  primary: "primary",
  neutral: "default",
  danger: "danger",
  success: "success",
  warning: "warning",
};
const emphasisMap: Record<ActionButtonEmphasis, ActionPresentation> = {
  high: "solid",
  medium: "bordered",
  low: "light",
};

export function ActionButton({
  children,
  tone,
  emphasis,
  size = "sm",
  className,
  icon,
  disabled,
  pending,
  iconOnly,
  label,
  onClick,
  startIcon,
  color,
  variant,
  isDisabled,
  isPending,
  isIconOnly,
  ariaLabel,
  onPress,
}: ActionButtonProps) {
  if (color !== undefined) deprecated("color");
  if (variant !== undefined) deprecated("variant");
  if (startIcon !== undefined) deprecated("startIcon");
  if (isDisabled !== undefined) deprecated("isDisabled");
  if (isPending !== undefined) deprecated("isPending");
  if (isIconOnly !== undefined) deprecated("isIconOnly");
  if (ariaLabel !== undefined) deprecated("ariaLabel");
  if (onPress !== undefined) deprecated("onPress");

  // Preserve legacy styling when callers haven't explicitly opted into
  // the semantic API; precedence is always the new ERP-owned property.
  const resolvedTone = tone !== undefined ? toneMap[tone] : (color ?? "primary");
  const resolvedPresentation = emphasis !== undefined ? emphasisMap[emphasis] : (variant ?? "solid");

  return (
    <Button
      size={size}
      variant={actionVariant(resolvedTone, resolvedPresentation)}
      className={cn("erp-motion-interactive", className)}
      isDisabled={disabled ?? isDisabled}
      isPending={pending ?? isPending}
      isIconOnly={iconOnly ?? isIconOnly ?? false}
      aria-label={label ?? ariaLabel}
      onPress={onClick ?? onPress}
    >
      {icon ?? startIcon}
      {children}
    </Button>
  );
}
