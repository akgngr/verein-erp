"use client";

import { Button, Input, Tooltip, addToast } from "@heroui/react";
import { Copy, Eye, EyeOff, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { generatePassword } from "@/shared/security/generate-password";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

type FormPasswordInputProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  control: Control<T>;
  description?: string;
  isRequired?: boolean;
  /** "Parola üret" düğmesini gösterir (yeni hesap / parola sıfırlama). */
  allowGenerate?: boolean;
  autoComplete?: string;
};

/** Göster/gizle, kopyala ve isteğe bağlı güçlü parola üretme düğmeli parola alanı. */
export function FormPasswordInput<T extends FieldValues>({
  name,
  label,
  control,
  description,
  isRequired,
  allowGenerate = false,
  autoComplete = "new-password",
}: FormPasswordInputProps<T>) {
  const t = useTranslations("common.password");
  const translateMessage = useTranslateMessage();
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value =
          field.value === null || field.value === undefined
            ? ""
            : String(field.value);
        const copy = async () => {
          try {
            await navigator.clipboard.writeText(value);
            addToast({ title: t("copied"), color: "success" });
          } catch (error) {
            console.error(error instanceof Error ? error.message : error);
          }
        };
        return (
          <Input
            id={`form-input-${String(name)}`}
            label={label}
            labelPlacement="outside"
            placeholder=" "
            description={description}
            isRequired={isRequired}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            value={value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            isInvalid={Boolean(fieldState.error)}
            errorMessage={translateMessage(fieldState.error?.message)}
            classNames={{
              label: "text-small font-medium text-foreground pb-1",
              input: visible ? "font-mono" : undefined,
              inputWrapper:
                "shadow-xs border-default-200 hover:border-default-400 focus-within:!border-primary transition-colors bg-default-50/50 hover:bg-default-100/50 focus-within:!bg-background",
            }}
            endContent={
              <div className="flex shrink-0 items-center gap-0.5">
                {value ? (
                  <Tooltip content={t("copy")} delay={300}>
                    <button
                      type="button"
                      onClick={copy}
                      aria-label={t("copy")}
                      className="rounded p-1 text-default-400 hover:text-default-700"
                    >
                      <Copy className="h-4 w-4" aria-hidden />
                    </button>
                  </Tooltip>
                ) : null}
                <Tooltip content={visible ? t("hide") : t("show")} delay={300}>
                  <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={visible ? t("hide") : t("show")}
                    aria-pressed={visible}
                    className="rounded p-1 text-default-400 hover:text-default-700"
                  >
                    {visible ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </Tooltip>
                {allowGenerate ? (
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="ml-1 h-7"
                    startContent={
                      <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                    }
                    onPress={() => {
                      field.onChange(generatePassword());
                      setVisible(true);
                    }}
                  >
                    {t("generate")}
                  </Button>
                ) : null}
              </div>
            }
          />
        );
      }}
    />
  );
}
