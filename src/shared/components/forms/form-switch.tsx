"use client";

import { Description, Label, Switch } from "@heroui/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

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
        <Switch
          id={`form-switch-${String(name)}`}
          isSelected={Boolean(field.value)}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isDisabled={isDisabled}
        >
          <Switch.Content ref={field.ref}>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label>{label}</Label>
          </Switch.Content>
          {description ? <Description>{description}</Description> : null}
        </Switch>
      )}
    />
  );
}
