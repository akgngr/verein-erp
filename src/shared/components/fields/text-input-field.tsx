"use client";

import { Description, FieldError, Input, InputGroup, Label, TextField } from "@heroui/react";
import type { ReactNode, Ref } from "react";

import { cn } from "@/shared/utils";

import type { FieldBaseProps, FieldSize } from "./types";

export type TextInputFieldProps = FieldBaseProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url" | "search";
  /** Decorative or textual content before/after the value (icon, unit, currency). */
  prefix?: ReactNode;
  suffix?: ReactNode;
  size?: FieldSize;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
  maxLength?: number;
};

const inputSize = (size: FieldSize) => (size === "sm" ? "h-9 text-sm" : undefined);

/** Single-line text input with label, help text and error. */
export function TextInputField({
  label, ariaLabel, description, error, isRequired, isDisabled, isReadOnly, id, name, className,
  value, defaultValue, onChange, onBlur, type = "text", placeholder, autoComplete, inputMode,
  prefix, suffix, size = "md", inputRef, autoFocus, maxLength,
}: TextInputFieldProps) {
  const inputProps = { ref: inputRef, type, placeholder, autoComplete, inputMode, autoFocus, maxLength, className: cn("w-full", inputSize(size)) };
  return (
    <TextField
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      aria-label={label ? undefined : ariaLabel}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isInvalid={Boolean(error)}
      className={cn("w-full", className)}
    >
      {label ? <Label className="text-[13px] font-medium">{label}</Label> : null}
      {prefix || suffix ? (
        <InputGroup>
          {prefix ? <InputGroup.Prefix>{prefix}</InputGroup.Prefix> : null}
          <InputGroup.Input {...inputProps} />
          {suffix ? <InputGroup.Suffix>{suffix}</InputGroup.Suffix> : null}
        </InputGroup>
      ) : (
        <Input {...inputProps} />
      )}
      {description ? <Description>{description}</Description> : null}
      <FieldError>{error ?? undefined}</FieldError>
    </TextField>
  );
}
