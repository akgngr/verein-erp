"use client";

import { Description, FieldError, Label, TextArea, TextField } from "@heroui/react";
import type { Ref } from "react";

import { cn } from "@/shared/utils";

import type { FieldBaseProps } from "./types";

export type TextAreaFieldProps = FieldBaseProps & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

/** Multi-line text input with label, help text and error. */
export function TextAreaField({
  label, ariaLabel, description, error, isRequired, isDisabled, isReadOnly, id, name, className,
  value, defaultValue, onChange, onBlur, placeholder, rows = 3, maxLength, textareaRef,
}: TextAreaFieldProps) {
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
      <TextArea ref={textareaRef} rows={rows} maxLength={maxLength} placeholder={placeholder} className="w-full" />
      {description ? <Description>{description}</Description> : null}
      <FieldError>{error ?? undefined}</FieldError>
    </TextField>
  );
}
