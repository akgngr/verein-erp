"use client";

import { Button, Link } from "@heroui/react";
import type { ReactNode } from "react";

/**
 * KARAR: HeroUI v2 client bileşen gerektirdiğinden sunucu view'ları HeroUI Button'ı
 * doğrudan kullanamaz; PageHeader aksiyonları için bu sarmalayıcı kullanılır.
 */
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
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "ghost" | "shadow";
}) {
  return (
    <Button as={Link} href={href} color={color} size={size} variant={variant} startContent={startIcon}>
      {children}
    </Button>
  );
}
