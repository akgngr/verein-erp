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
  download,
  target,
  rel,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  tone?: LinkButtonTone;
  emphasis?: LinkButtonEmphasis;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render as plain <a> with download attribute (disables Next.js Link prefetching). */
  download?: boolean | string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
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
  const classes = cn(
    buttonVariants({
      size,
      variant: actionVariant(resolvedTone, resolvedStyle),
    }),
    "erp-motion-interactive",
    className,
  );
  // API routes, file downloads, and external links MUST use a native <a> tag so Next.js
  // never auto-prefetches export/PDF endpoints on page render (avoids phantom audit logs & load).
  const isNativeAnchor =
    download !== undefined ||
    href.startsWith("/api/") ||
    /^https?:\/\//i.test(href);
  if (isNativeAnchor) {
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        className={classes}
      >
        {icon ?? startIcon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-label={ariaLabel} className={classes}>
      {icon ?? startIcon}
      {children}
    </Link>
  );
}
