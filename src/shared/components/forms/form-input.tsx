"use client";

import {
  TextField,
  Input,
  Label,
  Description,
  FieldError,
} from "@heroui/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { cn } from "@/shared/utils";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

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

/** HeroUI v3 field composition with controlled RHF value and native focus ref. */
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
  const translateMessage = useTranslateMessage();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          id={`form-input-${String(name)}`}
          name={field.name}
          value={
            field.value === null || field.value === undefined
              ? ""
              : String(field.value)
          }
          onChange={field.onChange}
          onBlur={field.onBlur}
          isRequired={isRequired}
          isDisabled={isDisabled}
          isInvalid={Boolean(fieldState.error)}
          className={cn(
            "w-full",
            labelPlacement === "outside-left" &&
              "grid grid-cols-[minmax(7rem,1fr)_2fr] items-start gap-x-4",
          )}
        >
          <Label className="text-[13px] font-medium">{label}</Label>
          <Input
            ref={field.ref}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            className="w-full"
          />
          {description ? <Description>{description}</Description> : null}
          <FieldError>{translateMessage(fieldState.error?.message)}</FieldError>
        </TextField>
      )}
    />
  );
}
