"use client";

import { Input } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

export type FormInputProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isRequired?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  autoComplete?: string;
  isDisabled?: boolean;
  labelPlacement?: "inside" | "outside" | "outside-left";
};

/** HeroUI Input + react-hook-form Controller sarmalayıcısı (10.4). */
export function FormInput<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isRequired,
  placeholder,
  type = "text",
  autoComplete,
  isDisabled,
  labelPlacement = "outside",
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Input
          id={`form-input-${String(name)}`}
          label={label}
          labelPlacement={labelPlacement}
          description={description}
          isRequired={isRequired}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          isDisabled={isDisabled}
          value={typeof field.value === "string" ? field.value : ""}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={Boolean(fieldState.error)}
          errorMessage={fieldState.error?.message}
          classNames={{
            label: "text-small font-medium text-foreground pb-1",
            inputWrapper: "shadow-xs border-default-200 hover:border-default-400 focus-within:!border-primary transition-colors bg-default-50/50 hover:bg-default-100/50 focus-within:!bg-background",
          }}
        />
      )}
    />
  );
}
