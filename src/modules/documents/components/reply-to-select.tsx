"use client";

import { useTranslations } from "next-intl";

import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";

import type { ReplyTargetOption } from "../types";

function replyTargetLabel(option: ReplyTargetOption): string {
  return `${option.registryNumber} — ${option.counterparty} — ${option.subject}`;
}

/**
 * "Yanıtlanan evrak" seçici (8.2): yalnızca giden evrak formunda görünür.
 *
 * KARAR: Aday gelen evraklar sunucudan (search-reply-targets, en yeni 20 kayıt)
 * statik liste olarak alınır; arama istemci tarafında kayıt no/kurum/konu
 * üzerinden yapılır. Belgede ayrı arama API'si tanımlanmadığı için ek uç
 * açılmamıştır. Form alanı SEÇİLİ EVRAĞIN ID'sini taşır; arama metni bileşen
 * içinde ayrı tutulur.
 */
export function ReplyToSelect<T extends FieldValues>({
  name,
  control,
  options,
  isDisabled,
}: {
  name: Path<T>;
  control: Control<T>;
  options: ReplyTargetOption[];
  isDisabled?: boolean;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <ReplyToSelectInner
          value={typeof field.value === "string" ? field.value : ""}
          onChange={field.onChange}
          options={options}
          isDisabled={isDisabled}
          isInvalid={Boolean(fieldState.error)}
          errorMessage={fieldState.error?.message}
        />
      )}
    />
  );
}

function ReplyToSelectInner({
  value,
  onChange,
  options,
  isDisabled,
  isInvalid,
  errorMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReplyTargetOption[];
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}) {
  const t = useTranslations("documents.form");
  // KARAR: Arama metni ayrı state'te tutulur; görünen metin türetilir —
  // seçim varsa etiket, yoksa yazılan arama metni (effect gerekmez).
  const [searchText, setSearchText] = useState("");
  const selected = options.find((option) => option.id === value);
  const displayed = selected ? replyTargetLabel(selected) : searchText;

  return (
    <Autocomplete
      id="documents-reply-to"
      label={t("replyTo")}
      labelPlacement="outside"
      description={t("replyToDescription")}
      isDisabled={isDisabled}
      allowsCustomValue={false}
      items={options}
      selectedKey={selected ? selected.id : null}
      inputValue={displayed}
      onInputChange={(next) => {
        setSearchText(next);
        // Yazmaya başlayınca mevcut seçim temizlenir (arama moduna geçilir).
        if (selected && next !== replyTargetLabel(selected)) onChange("");
      }}
      onSelectionChange={(key) => {
        onChange(key === null ? "" : String(key));
      }}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
    >
      {(option) => (
        <AutocompleteItem key={option.id} textValue={replyTargetLabel(option)}>
          {replyTargetLabel(option)}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}
