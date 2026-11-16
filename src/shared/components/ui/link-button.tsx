"use client";

import { buttonVariants } from "@heroui-v3/react";
import Link from "next/link";
import { actionVariant } from "./action-appearance";
import type { ReactNode } from "react";

/** Shared route action with native Next.js navigation and HeroUI v3 appearance. */
export function LinkButton({
  href,
  children,
  startIcon,
  color = "primary",
  size = "sm",
  variant = "solid",
}: {
  href: string;
  children: ReactNode;
  startIcon?: ReactNode;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
  size?: "sm" | "md" | "lg";
  variant?:
    | "solid"
    | "bordered"
    | "light"
    | "flat"
    | "faded"
    | "ghost"
    | "shadow";
}) {
  return (
    <Link
      href={href}
      className={buttonVariants({
        size,
        variant: actionVariant(color, variant),
      })}
    >
      {startIcon}
      {children}
    </Link>
  );
}
