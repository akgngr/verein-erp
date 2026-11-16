"use client";

import {
  Button,
  Description,
  FieldError,
  InputGroup,
  Label,
  TextField,
  Tooltip,
} from "@heroui-v3/react";
import { addToast } from "@heroui/react";
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
  allowGenerate?: boolean;
  autoComplete?: string;
};

/** Password tools stay outside the text input's accessible name. */
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
        const value = field.value == null ? "" : String(field.value);
        const copy = async () => {
          try {
            await navigator.clipboard.writeText(value);
            addToast({ title: t("copied"), color: "success" });
          } catch (error) {
            console.error(error instanceof Error ? error.message : error);
          }
        };
        return (
          <TextField
            name={field.name}
            value={value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isRequired={isRequired}
            isInvalid={Boolean(fieldState.error)}
            className="w-full"
          >
            <Label className="text-[13px] font-medium">{label}</Label>
            <InputGroup>
              <InputGroup.Input
                ref={field.ref}
                type={visible ? "text" : "password"}
                autoComplete={autoComplete}
                className={visible ? "font-mono" : undefined}
              />
              <InputGroup.Suffix className="gap-0.5">
                {value ? (
                  <Tooltip delay={300}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="tertiary"
                      aria-label={t("copy")}
                      onPress={() => void copy()}
                    >
                      <Copy className="h-4 w-4" aria-hidden />
                    </Button>

                    <Tooltip.Content>{t("copy")}</Tooltip.Content>
                  </Tooltip>
                ) : null}
                <Tooltip delay={300}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="tertiary"
                    aria-label={visible ? t("hide") : t("show")}
                    aria-pressed={visible}
                    onPress={() => setVisible((current) => !current)}
                  >
                    {visible ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </Button>

                  <Tooltip.Content>
                    {visible ? t("hide") : t("show")}
                  </Tooltip.Content>
                </Tooltip>
                {allowGenerate ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-1 h-7"
                    onPress={() => {
                      field.onChange(generatePassword());
                      setVisible(true);
                    }}
                  >
                    <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                    {t("generate")}
                  </Button>
                ) : null}
              </InputGroup.Suffix>
            </InputGroup>
            {description ? <Description>{description}</Description> : null}
            <FieldError>
              {translateMessage(fieldState.error?.message)}
            </FieldError>
          </TextField>
        );
      }}
    />
  );
}
