"use client";

/**
 * UI kit — field primitives (W3). Framework-independent prop contracts; the implementation is the only
 * place that knows HeroUI. Composition stays declarative: <TextField><Label/><Input/><Description/><FieldError/></TextField>.
 */
import {
  Description as HDescription, FieldError as HFieldError, Input as HInput, InputGroup as HInputGroup, Label as HLabel,
  TextArea as HTextArea, TextField as HTextField,
} from "@heroui/react";
import type { ChangeEvent, CSSProperties, FocusEvent, KeyboardEvent, ReactNode, Ref } from "react";

type Base = { className?: string; children?: ReactNode };

export type TextFieldProps = Base & {
  value?: string; defaultValue?: string; onChange?: (value: string) => void; onBlur?: (event: FocusEvent) => void;
  isDisabled?: boolean; isInvalid?: boolean; isRequired?: boolean; isReadOnly?: boolean;
  id?: string; name?: string; "aria-label"?: string; type?: string; autoFocus?: boolean;
};
export function TextField(props: TextFieldProps) {
  return <HTextField {...(props as Record<string, unknown>)} />;
}

export function Label({ className, children, htmlFor, id }: Base & { htmlFor?: string; id?: string }) {
  return <HLabel className={className} htmlFor={htmlFor} id={id}>{children}</HLabel>;
}
export function Description({ className, children }: Base) {
  return <HDescription className={className}>{children}</HDescription>;
}
export function FieldError({ className, children }: Base) {
  return <HFieldError className={className}>{children}</HFieldError>;
}

export type InputProps = {
  className?: string; placeholder?: string; type?: string; maxLength?: number; minLength?: number; min?: number | string; max?: number | string;
  step?: number | string; autoComplete?: string; inputMode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url" | "search" | "none";
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void; onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void; ref?: Ref<HTMLInputElement>; id?: string; name?: string;
  value?: string | number; defaultValue?: string | number; autoFocus?: boolean; readOnly?: boolean; disabled?: boolean; "aria-label"?: string; style?: CSSProperties;
};
export function Input(props: InputProps) {
  return <HInput {...(props as Record<string, unknown>)} />;
}

export type TextAreaProps = Omit<InputProps, "type" | "min" | "max" | "step" | "inputMode" | "ref" | "onChange" | "onBlur" | "onKeyDown"> & {
  rows?: number; ref?: Ref<HTMLTextAreaElement>;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void; onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};
export function TextArea(props: TextAreaProps) {
  return <HTextArea {...(props as Record<string, unknown>)} />;
}

function InputGroupRoot({ className, children }: Base) {
  return <HInputGroup className={className}>{children}</HInputGroup>;
}
function InputGroupPrefix({ className, children }: Base) {
  return <HInputGroup.Prefix className={className}>{children}</HInputGroup.Prefix>;
}
function InputGroupSuffix({ className, children }: Base) {
  return <HInputGroup.Suffix className={className}>{children}</HInputGroup.Suffix>;
}
function InputGroupInput(props: InputProps) {
  return <HInputGroup.Input {...(props as Record<string, unknown>)} />;
}
export const InputGroup = Object.assign(InputGroupRoot, { Prefix: InputGroupPrefix, Suffix: InputGroupSuffix, Input: InputGroupInput });
