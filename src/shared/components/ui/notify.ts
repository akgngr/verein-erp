"use client";

import { toast } from "@heroui/react";

/** ERP-owned toast API. Framework variant names never leave this adapter. */
export type NotifyKind = "success" | "error" | "info" | "warning";
export type NotifyOptions = { timeout?: number };

/** @deprecated Temporary compatibility for already migrated modules. */
export type NotifyVariant = "success" | "danger" | "warning" | "default";

const appearance: Record<NotifyKind, NotifyVariant> = {
  success: "success",
  error: "danger",
  info: "default",
  warning: "warning",
};

function show(message: string, kind: NotifyKind, options?: NotifyOptions) {
  toast(message, { variant: appearance[kind], timeout: options?.timeout });
}

/**
 * Semantic notification API:
 *   notify.success("Saved")
 *   notify.error("Unable to save", { timeout: 6000 })
 *
 * The callable form is kept only for existing code until W1 migration is
 * complete. Do not add new callers of the deprecated callable API.
 */
function legacyNotify(
  message: string,
  variant: NotifyVariant = "default",
  options?: NotifyOptions,
) {
  const kind: NotifyKind = variant === "danger" ? "error" : variant === "default" ? "info" : variant;
  show(message, kind, options);
}

export const notify = Object.assign(legacyNotify, {
  success: (message: string, options?: NotifyOptions) => show(message, "success", options),
  error: (message: string, options?: NotifyOptions) => show(message, "error", options),
  info: (message: string, options?: NotifyOptions) => show(message, "info", options),
  warning: (message: string, options?: NotifyOptions) => show(message, "warning", options),
});
