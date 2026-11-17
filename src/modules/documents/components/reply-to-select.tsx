"use client";

import { useTranslations } from "next-intl";

import { ComboBox, Description, FieldError, Input, Label } from "@/shared/components/kit";
import { FieldClearButton } from "@/shared/components/forms/field-clear-button";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";
import { useState, type Ref } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

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
          inputRef={field.ref}
          onBlur={field.onBlur}
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
  inputRef,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReplyTargetOption[];
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
}) {
  const t = useTranslations("documents.form");
  const translateMessage = useTranslateMessage();
  // KARAR: Arama metni ayrı state'te tutulur; görünen metin türetilir —
  // seçim varsa etiket, yoksa yazılan arama metni (effect gerekmez).
  const [searchText, setSearchText] = useState("");
  const selected = options.find((option) => option.id === value);
  const displayed = selected ? replyTargetLabel(selected) : searchText;

  return (
    <ComboBox
      id="documents-reply-to"
      isDisabled={isDisabled}
      allowsCustomValue={false}
      defaultItems={options}
      value={selected?.id ?? null}
      inputValue={displayed}
      onInputChange={(next) => {
        setSearchText(next);
        if (selected && next !== replyTargetLabel(selected)) onChange("");
      }}
      onChange={(key) => onChange(key === null ? "" : String(key))}
      isInvalid={isInvalid}
      className="w-full"
    >
      <Label>{t("replyTo")}</Label>
      <ComboBox.InputGroup>
        <Input ref={inputRef} onBlur={onBlur} />
        {displayed ? (
          <FieldClearButton
            onPress={() => {
              setSearchText("");
              onChange("");
            }}
            isDisabled={isDisabled}
          />
        ) : null}
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <Description>{t("replyToDescription")}</Description>
      <ComboBox.Popover>
        <ComboBox.List<ReplyTargetOption>>
          {(option) => (
            <ComboBox.Item id={option.id} textValue={replyTargetLabel(option)}>
              <Label>{replyTargetLabel(option)}</Label>
            </ComboBox.Item>
          )}
        </ComboBox.List>
      </ComboBox.Popover>
      <FieldError>{translateMessage(errorMessage)}</FieldError>
    </ComboBox>
  );
}
