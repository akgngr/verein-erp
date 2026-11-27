"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Input, Label, TextField } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { requestPasswordResetAction, resetPasswordAction } from "../actions/password-reset";

/** #603: "Forgot password?" — the same neutral confirmation is shown for every address. */
export function PasswordResetRequestForm() {
  const t = useTranslations("users.passwordReset");
  const translate = useTranslateMessage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await requestPasswordResetAction({ email });
      if (result.ok) return setSent(true);
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      setError(translate(fieldError ?? result.error) ?? null);
    });

  if (sent) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-success-700">{t("sent")}</p>
        <Link href="/giris" className="text-sm font-medium text-accent hover:underline">{t("toLogin")}</Link>
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <TextField value={email} onChange={setEmail} className="w-full" isRequired>
        <Label>{t("email")}</Label>
        <Input type="email" autoComplete="email" />
      </TextField>
      {error ? <p role="alert" className="text-sm text-danger-600">{error}</p> : null}
      <ActionButton tone="primary" pending={pending} disabled={!email.trim()} onClick={submit}>{t("submitRequest")}</ActionButton>
      <Link href="/giris" className="text-sm text-ink-500 hover:underline">{t("toLogin")}</Link>
    </form>
  );
}

/** #603: Sets a new password with a valid one-time reset link. */
export function PasswordResetForm({ token }: { token: string }) {
  const t = useTranslations("users.passwordReset");
  const translate = useTranslateMessage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await resetPasswordAction({ token, password, confirm });
      if (result.ok) return setDone(true);
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      setError(translate(fieldError ?? result.error) ?? null);
    });

  if (done) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-success-700">{t("done")}</p>
        <Link href="/giris" className="text-sm font-medium text-accent hover:underline">{t("toLogin")}</Link>
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <TextField value={password} onChange={setPassword} className="w-full">
        <Label>{t("password")}</Label>
        <Input type="password" autoComplete="new-password" />
      </TextField>
      <TextField value={confirm} onChange={setConfirm} className="w-full">
        <Label>{t("confirm")}</Label>
        <Input type="password" autoComplete="new-password" />
      </TextField>
      {error ? <p role="alert" className="text-sm text-danger-600">{error}</p> : null}
      <ActionButton tone="primary" pending={pending} disabled={!password || !confirm} onClick={submit}>{t("submitReset")}</ActionButton>
    </form>
  );
}
