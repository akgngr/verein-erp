"use client";

import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

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
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          label={label}
          isRequired={isRequired}
          isDisabled={isDisabled}
          allowsCustomValue
          inputValue={typeof field.value === "string" ? field.value : ""}
          onInputChange={(value) => field.onChange(value)}
          onSelectionChange={(key) => {
            if (key !== null) field.onChange(String(key));
          }}
          defaultItems={suggestions.map((value) => ({ value }))}
          isInvalid={Boolean(fieldState.error)}
          errorMessage={fieldState.error?.message}
        >
          {(item) => (
            <AutocompleteItem key={item.value} textValue={item.value}>
              {item.value}
            </AutocompleteItem>
          )}
        </Autocomplete>
      )}
    />
  );
}
