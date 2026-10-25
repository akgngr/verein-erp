"use client";

import { Switch } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

export type FormSwitchProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isDisabled?: boolean;
};

/** HeroUI Switch + react-hook-form Controller sarmalayıcısı (10.4). Değer tipi boolean'dır. */
export function FormSwitch<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isDisabled,
}: FormSwitchProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div>
          <Switch
            isSelected={Boolean(field.value)}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            isDisabled={isDisabled}
          >
            {label}
          </Switch>
          {description ? <p className="mt-1 text-tiny text-default-400">{description}</p> : null}
        </div>
      )}
    />
  );
}
