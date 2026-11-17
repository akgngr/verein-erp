"use client";

import { Description, FieldError, Label, Radio, RadioGroup } from "@heroui/react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

import type { FieldBaseProps } from "./types";

export type RadioOption<V extends string> = { value: V; label: ReactNode; description?: ReactNode; isDisabled?: boolean };

export type RadioGroupFieldProps<V extends string> = FieldBaseProps & {
  options: readonly RadioOption<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  orientation?: "vertical" | "horizontal";
};

/** Single choice from a short, always visible list. */
export function RadioGroupField<V extends string>({
  label, ariaLabel, description, error, isRequired, isDisabled, isReadOnly, id, name, className,
  options, value, defaultValue, onChange, orientation = "vertical",
}: RadioGroupFieldProps<V>) {
  return (
    <RadioGroup
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={(next) => onChange?.(next as V)}
      aria-label={label ? undefined : ariaLabel}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      isInvalid={Boolean(error)}
      orientation={orientation}
      className={className}
    >
      {label ? <Label className="text-[13px] font-medium">{label}</Label> : null}
      <div className={cn("flex gap-2", orientation === "vertical" ? "flex-col" : "flex-row flex-wrap")}>
        {options.map((option) => (
          <Radio key={option.value} value={option.value} isDisabled={option.isDisabled}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Label>{option.label}</Label>
            </Radio.Content>
            {option.description ? <Description>{option.description}</Description> : null}
          </Radio>
        ))}
      </div>
      {description ? <Description>{description}</Description> : null}
      <FieldError>{error ?? undefined}</FieldError>
    </RadioGroup>
  );
}
