"use client";

import { buttonVariants } from "@heroui/react";
import { actionVariant } from "./action-appearance";
import { cn } from "@/shared/utils";

export type ActionClassNameOptions = {
  tone?: "primary" | "neutral" | "danger" | "success" | "warning";
  emphasis?: "high" | "medium" | "low";
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Semantic button styling for native links and non-button controls. */
export function actionClassName({
  tone = "primary",
  emphasis = "high",
  size = "sm",
  className,
}: ActionClassNameOptions = {}): string {
  const resolvedTone = tone === "neutral" ? "default" : tone;
  const resolvedStyle = ({ high: "solid", medium: "bordered", low: "light" } as const)[emphasis];
  return cn(buttonVariants({
    size,
    variant: actionVariant(resolvedTone, resolvedStyle),
  }), "erp-motion-interactive", className);
}
