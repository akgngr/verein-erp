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
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Input
          label={label}
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
        />
      )}
    />
  );
}
