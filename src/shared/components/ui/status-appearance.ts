import type { ActionTone } from "./action-appearance";

/** Application status semantics shared by badges and feedback. */
export function statusTone(
  tone: ActionTone,
): "default" | "accent" | "success" | "warning" | "danger" {
  return tone === "primary" || tone === "secondary" ? "accent" : tone;
}
export function badgeVariant(
  presentation:
    "flat" | "dot" | "bordered" | "solid" | "light" | "faded" | "shadow",
) {
  return presentation === "solid" || presentation === "shadow"
    ? ("primary" as const)
    : presentation === "bordered" || presentation === "faded"
      ? ("secondary" as const)
      : presentation === "light"
        ? ("tertiary" as const)
        : ("soft" as const);
}

/** The application also exposes a violet status tone, beyond the library's fixed palette. */
export function statusStyle(
  tone: ActionTone,
): import("react").CSSProperties | undefined {
  return tone === "secondary"
    ? ({
        "--chip-bg": "color-mix(in srgb,var(--secondary) 15%,transparent)",
        "--chip-fg": "var(--secondary)",
      } as import("react").CSSProperties)
    : undefined;
}
