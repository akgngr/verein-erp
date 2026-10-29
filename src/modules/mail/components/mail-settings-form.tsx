"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button, Input } from "@heroui/react";
import { CheckCircle2, ChevronDown, PlugZap, Save, XCircle } from "lucide-react";
import { saveMailSettingsAction, verifyMailConnectionAction } from "../actions/mail-actions";
import {
  MAIL_DEFAULT_PORTS,
  MAIL_SECURITY_LABEL_KEYS,
  MAIL_SECURITY_OPTIONS,
  MAIL_TRANSPORT_LABEL_KEYS,
  MAIL_TRANSPORTS,
} from "../constants";
import { getDefaultPort, isMailSecurity, toMailSettingsFormValues } from "../helpers/mail-helpers";
import { mailSettingsSchema, type MailSettingsFormValues } from "../schemas/mail-schema";
import type { MailActionResult, MailSettingsView } from "../types";

interface MailSettingsFormProps {
  settings: MailSettingsView;
  canUpdate: boolean;
}

type Feedback = { tone: "success" | "danger"; message: string; detail?: string } | null;

const nativeSelectClassName =
  "h-10 w-full appearance-none rounded-medium bg-default-100 px-3 pr-9 text-sm text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60";

const defaultPorts = Object.values(MAIL_DEFAULT_PORTS);

export function MailSettingsForm({ settings, canUpdate }: MailSettingsFormProps) {
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
    watch,
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

  const transport = watch("transport");
  const isSmtp = transport === "SMTP";

  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    return message.startsWith("validation.") ? t(message) : t("validation.invalid");
  };

  const toFeedback = (result: MailActionResult, successKey: string): Feedback =>
    result.ok
      ? { tone: "success", message: t(successKey) }
      : { tone: "danger", message: t(`errors.${result.error}`), detail: result.detail };

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
        toFeedback(result, values.transport === "LOG" ? "settings.logModeOk" : "settings.verified"),
      );
    });
  });

  const securityField = register("security");

  return (
    <form
      onSubmit={onSave}
      noValidate
      className="flex flex-col gap-5 rounded-large border border-default-200 bg-content1 p-5 shadow-small"
    >
      <div>
        <h2 className="text-medium font-semibold text-foreground">{t("settings.title")}</h2>
        <p className="text-small text-default-500">{t("settings.description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label htmlFor="mail-transport" className="text-small text-foreground">
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
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400"
              aria-hidden="true"
            />
          </div>
          {!isSmtp ? (
            <p className="rounded-medium bg-warning-50 px-3 py-2 text-small text-warning-700">
              {t("hints.logMode")}
            </p>
          ) : null}
        </div>

        <Input
          {...register("host")}
          label={t("fields.host")}
          placeholder={t("placeholders.host")}
          isRequired={isSmtp}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.host)}
          errorMessage={errorText(errors.host?.message)}
        />

        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mail-security" className="text-small text-foreground">
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
                  if (isMailSecurity(next) && defaultPorts.includes(getValues("port"))) {
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
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400"
                aria-hidden="true"
              />
            </div>
          </div>

          <Input
            {...register("port", { valueAsNumber: true })}
            type="number"
            min={1}
            max={65535}
            label={t("fields.port")}
            isRequired
            isDisabled={isDisabled}
            isInvalid={Boolean(errors.port)}
            errorMessage={errorText(errors.port?.message)}
          />
        </div>

        <Input
          {...register("username")}
          label={t("fields.username")}
          placeholder={t("placeholders.username")}
          autoComplete="off"
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.username)}
          errorMessage={errorText(errors.username?.message)}
        />

        <Input
          {...register("password")}
          type="password"
          label={t("fields.password")}
          placeholder={settings.hasPassword ? t("placeholders.passwordStored") : " "}
          description={settings.hasPassword ? t("hints.passwordStored") : t("hints.password")}
          autoComplete="new-password"
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.password)}
          errorMessage={errorText(errors.password?.message)}
        />

        <Input
          {...register("fromAddress")}
          type="email"
          label={t("fields.fromAddress")}
          placeholder={t("placeholders.fromAddress")}
          isRequired={isSmtp}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.fromAddress)}
          errorMessage={errorText(errors.fromAddress?.message)}
        />

        <Input
          {...register("fromName")}
          label={t("fields.fromName")}
          placeholder={t("placeholders.fromName")}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.fromName)}
          errorMessage={errorText(errors.fromName?.message)}
        />

        <Input
          {...register("replyTo")}
          type="email"
          label={t("fields.replyTo")}
          placeholder={t("placeholders.replyTo")}
          description={t("hints.replyTo")}
          isDisabled={isDisabled}
          isInvalid={Boolean(errors.replyTo)}
          errorMessage={errorText(errors.replyTo?.message)}
          className="md:col-span-2"
        />
      </div>

      {feedback ? (
        <div
          role={feedback.tone === "danger" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-medium px-3 py-2 text-small ${
            feedback.tone === "success"
              ? "bg-success-50 text-success-700"
              : "bg-danger-50 text-danger"
          }`}
        >
          {feedback.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5">
            <span>{feedback.message}</span>
            {feedback.detail ? (
              <code className="break-all text-tiny opacity-80">{feedback.detail}</code>
            ) : null}
          </div>
        </div>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="bordered"
            onPress={() => void onVerify()}
            isLoading={isVerifying}
            isDisabled={isSaving}
            startContent={isVerifying ? null : <PlugZap className="h-4 w-4" />}
          >
            {t("actions.verify")}
          </Button>
          <Button
            color="primary"
            type="submit"
            isLoading={isSaving}
            isDisabled={isVerifying}
            startContent={isSaving ? null : <Save className="h-4 w-4" />}
          >
            {t("actions.save")}
          </Button>
        </div>
      ) : (
        <p className="text-small text-default-500">{t("settings.readOnly")}</p>
      )}
    </form>
  );
}
