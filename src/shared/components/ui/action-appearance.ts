import type { Button } from "@heroui/react";

/** Existing application action intent, independent of the component library's palette API. */
export type ActionTone =
  "default" | "primary" | "secondary" | "success" | "warning" | "danger";
export type ActionPresentation =
  "solid" | "bordered" | "light" | "flat" | "faded" | "ghost" | "shadow";
export function actionVariant(
  tone: ActionTone,
  presentation: ActionPresentation,
): Button["Props"]["variant"] {
  if (tone === "danger")
    return presentation === "solid" || presentation === "shadow"
      ? "danger"
      : "danger-soft";
  if (presentation === "ghost") return "ghost";
  if (presentation === "bordered") return "outline";
  if (presentation === "light" || presentation === "flat") return "tertiary";
  if (presentation === "faded" || tone === "default" || tone === "secondary")
    return "secondary";
  return "primary";
}
