"use client";

import { Input, Label, TextField } from "@heroui/react";

import { cn } from "@/shared/utils";

export function FormTextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  inputClassName,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "email" | "url" | "tel";
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      className={className}
    >
      <Label>{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn("h-9 text-sm", inputClassName)}
      />
    </TextField>
  );
}
