"use client";

import { ComboBox, FieldError, Input, Label, ListBox } from "@heroui/react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { FieldClearButton } from "@/shared/components/forms/field-clear-button";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

/**
 * Gönderen/Alıcı otomatik tamamlama (8.2): önceki kurum/kişilerden öneri sunar,
 * serbest metin de kabul eder (allowsCustomValue). Öneriler sunucudan
 * (list-counterparties) statik olarak gelir; istemci tarafında filtrelenir.
 */
export function CounterpartyAutocomplete<T extends FieldValues>({
  name,
  label,
  control,
  suggestions,
  isRequired,
  isDisabled,
}: {
  name: Path<T>;
  label: string;
  control: Control<T>;
  suggestions: string[];
  isRequired?: boolean;
  isDisabled?: boolean;
}) {
  const translateMessage = useTranslateMessage();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <ComboBox
          id={`form-autocomplete-${String(name)}`}
          name={field.name}
          isRequired={isRequired}
          isDisabled={isDisabled}
          allowsCustomValue
          value={
            typeof field.value === "string" && suggestions.includes(field.value)
              ? field.value
              : null
          }
          inputValue={typeof field.value === "string" ? field.value : ""}
          onInputChange={field.onChange}
          onChange={(key) => {
            if (key !== null) field.onChange(String(key));
          }}
          defaultItems={suggestions.map((value) => ({ value }))}
          isInvalid={Boolean(fieldState.error)}
          className="w-full"
        >
          <Label>{label}</Label>
          <ComboBox.InputGroup>
            <Input ref={field.ref} onBlur={field.onBlur} />
            {field.value ? (
              <FieldClearButton
                onPress={() => field.onChange("")}
                isDisabled={isDisabled}
              />
            ) : null}
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox<{ value: string }>>
              {(item) => (
                <ListBox.Item id={item.value} textValue={item.value}>
                  <Label>{item.value}</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </ComboBox.Popover>
          <FieldError>{translateMessage(fieldState.error?.message)}</FieldError>
        </ComboBox>
      )}
    />
  );
}
