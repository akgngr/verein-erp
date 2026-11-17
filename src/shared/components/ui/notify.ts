"use client";

import { toast } from "@heroui/react";

export type NotifyVariant = "success" | "danger" | "warning" | "default";

export function notify(message: string, variant: NotifyVariant = "default") {
  toast(message, { variant });
}
