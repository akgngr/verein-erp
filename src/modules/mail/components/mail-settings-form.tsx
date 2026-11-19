"use client";
import { Description, FieldError, Input, Label, Spinner, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import {
  CheckCircle2,
  ChevronDown,
  PlugZap,
  Save,
  XCircle,
} from "lucide-react";
import {
  saveMailSettingsAction,
  verifyMailConnectionAction,
} from "../actions/mail-actions";
import {
  MAIL_DEFAULT_PORTS,
  MAIL_SECURITY_LABEL_KEYS,
  MAIL_SECURITY_OPTIONS,
  MAIL_TRANSPORT_LABEL_KEYS,
  MAIL_TRANSPORTS,
} from "../constants";
import {
  getDefaultPort,
  isMailSecurity,
  toMailSettingsFormValues,
} from "../helpers/mail-helpers";
import {
  mailSettingsSchema,
  type MailSettingsFormValues,
} from "../schemas/mail-schema";
import type { MailActionResult, MailSettingsView } from "../types";

interface MailSettingsFormProps {
  settings: MailSettingsView;
  canUpdate: boolean;
}

type Feedback = {
  tone: "success" | "danger";
  message: string;
  detail?: string;
} | null;

const nativeSelectClassName =
  "h-10 w-full appearance-none rounded-lg bg-ink-100 px-3 pr-9 text-sm text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50 disabled:cursor-not-allowed disabled:opacity-60";

const defaultPorts = Object.values(MAIL_DEFAULT_PORTS);

export function MailSettingsForm({
  settings,
  canUpdate,
}: MailSettingsFormProps) {
  const t = useTranslations("mail");
  const [isSaving, startSaving] = useTransition();
  const [isVerifying, startVerifying] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const isBusy = isSaving || isVerifying;
  const isDisabled = !canUpdate || isBusy;

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<MailSettingsFormValues>({
    resolver: zodResolver(mailSettingsSchema),
    defaultValues: toMailSettingsFormValues(settings),
  });

  useEffect(() => {
    reset(toMailSettingsFormValues(settings));
  }, [settings, reset]);

  const transport = useWatch({ control, name: "transport" });
  const isSmtp = transport === "SMTP";

  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    return message.startsWith("validation.")
      ? t(message)
      : t("validation.invalid");
  };

  const toFeedback = (
    result: MailActionResult,
    successKey: string,
  ): Feedback =>
    result.ok
      ? { tone: "success", message: t(successKey) }
      : {
          tone: "danger",
          message: t(`errors.${result.error}`),
          detail: result.detail,
        };

  const onSave = handleSubmit((values) => {
    setFeedback(null);
    startSaving(async () => {
      const result = await saveMailSettingsAction(values);
      setFeedback(toFeedback(result, "settings.saved"));
      if (result.ok) setValue("password", "");
    });
  });

  const onVerify = handleSubmit((values) => {
    setFeedback(null);
    startVerifying(async () => {
      const result = await verifyMailConnectionAction(values);
      setFeedback(
        toFeedback(
          result,
          values.transport === "LOG"
            ? "settings.logModeOk"
            : "settings.verified",
        ),
      );
    });
  });

  const securityField = register("security");

  return (
    <form
      onSubmit={onSave}
      noValidate
      className="flex flex-col gap-5 rounded-xl border border-ink-200 bg-surface p-5 shadow-sm"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {t("settings.title")}
        </h2>
        <p className="text-sm text-ink-500">{t("settings.description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label htmlFor="mail-transport" className="text-sm text-foreground">
            {t("fields.transport")}
          </label>
          <div className="relative">
            <select
              id="mail-transport"
              {...register("transport")}
              disabled={isDisabled}
              className={nativeSelectClassName}
            >
              {MAIL_TRANSPORTS.map((option) => (
                <option key={option} value={option}>
                  {t(MAIL_TRANSPORT_LABEL_KEYS[option])}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
          </div>
          {!isSmtp ? (
            <p className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-700">
              {t("hints.logMode")}
            </p>
          ) : null}
        </div>

        <TextField
          isRequired={isSmtp}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.host)}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.host")}</Label>
          <Input {...register("host")} placeholder={t("placeholders.host")} />
          <FieldError>{errorText(errors.host?.message)}</FieldError>
        </TextField>

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mail-security" className="text-sm text-foreground">
              {t("fields.security")}
            </label>
            <div className="relative">
              <select
                id="mail-security"
                {...securityField}
                onChange={(event) => {
                  void securityField.onChange(event);
                  const next = event.target.value;
                  // Follow the conventional port unless the user entered a custom one.
                  if (
                    isMailSecurity(next) &&
                    defaultPorts.includes(getValues("port"))
                  ) {
                    setValue("port", getDefaultPort(next));
                  }
                }}
                disabled={isDisabled}
                className={nativeSelectClassName}
              >
                {MAIL_SECURITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(MAIL_SECURITY_LABEL_KEYS[option])}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
            </div>
          </div>

          <TextField
            isRequired
            isDisabled={isDisabled}
            isInvalid={Boolean(errors.port)}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.port")}</Label>
            <Input
              {...register("port", { valueAsNumber: true })}
              type="number"
              min={1}
              max={65535}
            />
            <FieldError>{errorText(errors.port?.message)}</FieldError>
          </TextField>
        </div>

        <TextField
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.username)}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.username")}</Label>
          <Input
            {...register("username")}
            placeholder={t("placeholders.username")}
            autoComplete="off"
          />
          <FieldError>{errorText(errors.username?.message)}</FieldError>
        </TextField>

        <TextField
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.password)}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.password")}</Label>
          <Input
            {...register("password")}
            type="password"
            placeholder={
              settings.hasPassword ? t("placeholders.passwordStored") : " "
            }
            autoComplete="new-password"
          />
          <Description>
            {settings.hasPassword
              ? t("hints.passwordStored")
              : t("hints.password")}
          </Description>
          <FieldError>{errorText(errors.password?.message)}</FieldError>
        </TextField>

        <TextField
          isRequired={isSmtp}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.fromAddress)}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.fromAddress")}</Label>
          <Input
            {...register("fromAddress")}
            type="email"
            placeholder={t("placeholders.fromAddress")}
          />
          <FieldError>{errorText(errors.fromAddress?.message)}</FieldError>
        </TextField>

        <TextField
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.fromName)}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.fromName")}</Label>
          <Input
            {...register("fromName")}
            placeholder={t("placeholders.fromName")}
          />
          <FieldError>{errorText(errors.fromName?.message)}</FieldError>
        </TextField>

        <TextField
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.replyTo)}
          className={["md:col-span-2"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.replyTo")}</Label>
          <Input
            {...register("replyTo")}
            type="email"
            placeholder={t("placeholders.replyTo")}
          />
          <Description>{t("hints.replyTo")}</Description>
          <FieldError>{errorText(errors.replyTo?.message)}</FieldError>
        </TextField>
      </div>

      {feedback ? (
        <div
          role={feedback.tone === "danger" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            feedback.tone === "success"
              ? "bg-success-50 text-success-700"
              : "bg-danger-50 text-danger"
          }`}
        >
          {feedback.tone === "success" ? (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5">
            <span>{feedback.message}</span>
            {feedback.detail ? (
              <code className="break-all text-xs opacity-80">
                {feedback.detail}
              </code>
            ) : null}
          </div>
        </div>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            onPress={() => void onVerify()}
            isDisabled={isSaving}
            variant={actionVariant("default", "bordered")}
            isPending={isVerifying}
          >
            {isVerifying ? <Spinner size="sm" tone="current" /> : null}
            {isVerifying ? null : <PlugZap className="h-4 w-4" />}
            {t("actions.verify")}
          </Button>
          <Button
            type="submit"
            isDisabled={isVerifying}
            variant={actionVariant("primary", "solid")}
            isPending={isSaving}
          >
            {isSaving ? <Spinner size="sm" tone="current" /> : null}
            {isSaving ? null : <Save className="h-4 w-4" />}
            {t("actions.save")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-500">{t("settings.readOnly")}</p>
      )}
    </form>
  );
}
