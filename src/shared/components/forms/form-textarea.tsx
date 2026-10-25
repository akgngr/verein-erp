"use client";

import { Textarea } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

export type FormTextareaProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isRequired?: boolean;
  placeholder?: string;
  rows?: number;
  isDisabled?: boolean;
};

/** HeroUI Textarea + react-hook-form Controller sarmalayıcısı (10.4). */
export function FormTextarea<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isRequired,
  placeholder,
  rows = 4,
  isDisabled,
}: FormTextareaProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Textarea
          label={label}
          description={description}
          isRequired={isRequired}
          placeholder={placeholder}
          isDisabled={isDisabled}
          minRows={rows}
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
