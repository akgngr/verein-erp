"use client";

/**
 * UI kit — actions (W2/W6): Button, ButtonGroup, TextLink, buttonClassName.
 * ERP-owned prop types; the UI framework is an implementation detail of this file.
 * Prefer the semantic ActionButton/LinkButton for new code; these primitives keep
 * existing screens framework-free without changing their look or behavior.
 */
import {
  Button as HButton,
  ButtonGroup as HButtonGroup,
  Link as HLink,
  buttonVariants as hButtonVariants,
} from "@heroui/react";
import type { AriaAttributes, CSSProperties, MouseEventHandler, ReactNode } from "react";

/** Visual variants (same names the ERP `actionVariant()` helper produces). */
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger" | "danger-soft";
export type ButtonSize = "sm" | "md" | "lg";

type Aria = Pick<AriaAttributes, "aria-label" | "aria-expanded" | "aria-haspopup" | "aria-controls" | "aria-pressed" | "aria-describedby">;

export type ButtonProps = Aria & {
  children?: ReactNode;
  className?: string;
  /** Yalnız konumlandırma için (ör. dinamik top/left); görünüm için variant/size kullanın. */
  style?: CSSProperties;
  id?: string;
  type?: "button" | "submit" | "reset";
  form?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isIconOnly?: boolean;
  isDisabled?: boolean;
  isPending?: boolean;
  autoFocus?: boolean;
  slot?: string;
  onPress?: () => void;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
};

export function Button({ onMouseDown, ...props }: ButtonProps) {
  return <HButton {...props} {...(onMouseDown ? { onMouseDown } : {})} />;
}

export type ButtonGroupProps = {
  children?: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isDisabled?: boolean;
  orientation?: "horizontal" | "vertical";
  "aria-label"?: string;
};

export function ButtonGroup(props: ButtonGroupProps) {
  return <HButtonGroup {...props} />;
}

export type TextLinkProps = {
  href: string;
  children?: ReactNode;
  className?: string;
  target?: "_blank" | "_self";
  rel?: string;
  title?: string;
  download?: boolean | string;
  "aria-label"?: string;
};

/** Inline text link with ERP link styling (external/file URLs; app routes use next/link or LinkButton). */
export function TextLink(props: TextLinkProps) {
  return <HLink {...props} />;
}

/** Button look for non-button elements (e.g. <a>, <label>, next/link). */
export function buttonClassName(options: { variant?: ButtonVariant; size?: ButtonSize; isIconOnly?: boolean; fullWidth?: boolean; className?: string } = {}): string {
  return hButtonVariants(options);
}
