"use client";

import { Textarea } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

export type FormTextareaProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isRequired?: boolean;
  placeholder?: string;
  rows?: number;
  isDisabled?: boolean;
  labelPlacement?: "inside" | "outside" | "outside-left";
};

/** HeroUI Textarea + react-hook-form Controller sarmalayıcısı (10.4). */
// KARAR: HeroUI, labelPlacement="outside" iken placeholder YOKSA label'ı input'un İÇİNE
// alır (giriş formunda E-posta dışarıda, Parola içeride görünüyordu). Dış yerleşimde
// placeholder verilmemişse boşluk karakteri verilerek label tutarlı biçimde dışarıda kalır.
export function FormTextarea<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isRequired,
  placeholder,
  rows = 4,
  isDisabled,
  labelPlacement = "outside",
}: FormTextareaProps<T>) {
  const translateMessage = useTranslateMessage();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Textarea
          id={`form-textarea-${String(name)}`}
          label={label}
          labelPlacement={labelPlacement}
          description={description}
          isRequired={isRequired}
          placeholder={placeholder ?? (labelPlacement === "outside" ? " " : undefined)}
          isDisabled={isDisabled}
          minRows={rows}
          value={typeof field.value === "string" ? field.value : ""}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={Boolean(fieldState.error)}
          errorMessage={translateMessage(fieldState.error?.message)}
          classNames={{
            label: "text-small font-medium text-foreground pb-1",
            inputWrapper: "shadow-xs border-default-200 hover:border-default-400 focus-within:!border-primary transition-colors bg-default-50/50 hover:bg-default-100/50 focus-within:!bg-background",
          }}
        />
      )}
    />
  );
}
