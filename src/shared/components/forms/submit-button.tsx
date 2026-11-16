"use client";

import { Button, Spinner } from "@heroui-v3/react";
import { actionVariant } from "../ui/action-appearance";
import type { ReactNode } from "react";

/** isLoading yönetimi + çift tıklamayı engelleme (10.4 SubmitButton). */
export function SubmitButton({
  children,
  isSubmitting,
  color = "primary",
  fullWidth = false,
  variant = "solid",
  className,
}: {
  children: ReactNode;
  isSubmitting: boolean;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
  fullWidth?: boolean;
  variant?:
    | "solid"
    | "bordered"
    | "light"
    | "flat"
    | "faded"
    | "ghost"
    | "shadow";
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant={actionVariant(color, variant)}
      isPending={isSubmitting}
      isDisabled={isSubmitting}
      fullWidth={fullWidth}
      className={
        className ?? "font-medium shadow-xs hover:shadow-sm transition-all"
      }
    >
      {isSubmitting ? <Spinner size="sm" color="current" /> : null}
      {children}
    </Button>
  );
}
