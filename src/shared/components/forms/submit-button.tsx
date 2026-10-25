"use client";

import { Button } from "@heroui/react";
import type { ReactNode } from "react";

/** isLoading yönetimi + çift tıklamayı engelleme (10.4 SubmitButton). */
export function SubmitButton({
  children,
  isSubmitting,
  color = "primary",
  fullWidth = false,
  variant = "solid",
}: {
  children: ReactNode;
  isSubmitting: boolean;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  fullWidth?: boolean;
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "ghost" | "shadow";
}) {
  return (
    <Button
      type="submit"
      color={color}
      variant={variant}
      isLoading={isSubmitting}
      isDisabled={isSubmitting}
      fullWidth={fullWidth}
    >
      {children}
    </Button>
  );
}
