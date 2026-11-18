"use client";

import { buttonVariants } from "@heroui/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { actionVariant, type ActionPresentation, type ActionTone } from "./action-appearance";
import { cn } from "@/shared/utils";

/** ERP-owned semantics; legacy color/variant remain only for transition. */
export type LinkButtonTone = "primary" | "neutral" | "danger" | "success" | "warning";
export type LinkButtonEmphasis = "high" | "medium" | "low";

export function LinkButton({
  href,
  children,
  icon,
  tone,
  emphasis,
  className,
  size = "sm",
  startIcon,
  color,
  variant,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  tone?: LinkButtonTone;
  emphasis?: LinkButtonEmphasis;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** @deprecated Use icon. */
  startIcon?: ReactNode;
  /** @deprecated Use tone. */
  color?: ActionTone;
  /** @deprecated Use emphasis. */
  variant?: ActionPresentation;
}) {
  const resolvedTone: ActionTone = tone === "neutral" ? "default" : (tone ?? color ?? "primary");
  const resolvedStyle: ActionPresentation = emphasis
    ? ({ high: "solid", medium: "bordered", low: "light" } as const)[emphasis]
    : variant ?? "solid";
  return (
    <Link
      href={href}
      className={cn(buttonVariants({
        size,
        variant: actionVariant(resolvedTone, resolvedStyle),
      }), "erp-motion-interactive", className)}
    >
      {icon ?? startIcon}
      {children}
    </Link>
  );
}
