import type { ReactNode } from "react";

/**
 * Framework-independent field contract (UI Platform W3). Modules use these props only; the HeroUI
 * implementation details (compound parts, slots, data attributes) stay inside src/shared/components/fields.
 */
export type FieldSize = "sm" | "md";

export type FieldBaseProps = {
  /** Visible label. Use `ariaLabel` instead when the surrounding UI already labels the field. */
  label?: ReactNode;
  ariaLabel?: string;
  description?: ReactNode;
  /** Validation message; non-empty marks the field invalid. */
  error?: string | null;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  id?: string;
  name?: string;
  /** Layout only (width, grid placement, spacing). */
  className?: string;
};
