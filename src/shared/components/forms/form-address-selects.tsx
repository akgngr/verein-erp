"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";
import { useWatch, type Control, type FieldValues, type Path } from "react-hook-form";

import { BUNDESLAENDER, COUNTRY_CODES, countryNameDe } from "@/shared/geo/germany";

import { FormSelect } from "./form-select";

type Props<T extends FieldValues> = { name: Path<T>; label: string; control: Control<T>; description?: string; isRequired?: boolean };

/** Bundesland seçimi (16 eyalet, resmî adlarıyla saklanır). */
export function FormStateSelect<T extends FieldValues>(props: Props<T>) {
  const current = useWatch({ control: props.control, name: props.name }) as string | null | undefined;
  const options = useMemo(() => withCurrent(BUNDESLAENDER.map((value) => ({ value, label: value })), current), [current]);
  return <FormSelect {...props} options={options} />;
}

/**
 * Ülke seçimi. `store="code"` ISO kodu ("DE"), `store="name"` Almanca adı ("Deutschland") saklar.
 * Etiket arayüz dilinde gösterilir.
 */
export function FormCountrySelect<T extends FieldValues>({ store, ...props }: Props<T> & { store: "code" | "name" }) {
  const locale = useLocale();
  const current = useWatch({ control: props.control, name: props.name }) as string | null | undefined;
  const options = useMemo(() => {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    return withCurrent(COUNTRY_CODES.map((code) => ({ value: store === "code" ? code : countryNameDe(code), label: display.of(code) ?? code })), current);
  }, [locale, store, current]);
  return <FormSelect {...props} options={options} />;
}

/** Eski kayıtlardaki listede olmayan değer kaybolmasın diye seçeneklere eklenir. */
function withCurrent(options: { value: string; label: string }[], current: string | null | undefined) {
  return current && !options.some((option) => option.value === current) ? [...options, { value: current, label: current }] : options;
}
