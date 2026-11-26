"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Input, Label, TextField } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { signOutOtherDevicesAction } from "../actions/sessions";

/** #603: Ends every other session after re-entering the current password; this device stays signed in. */
export function SignOutEverywhereForm() {
  const t = useTranslations("auth.profile.sessions");
  const translate = useTranslateMessage();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await signOutOtherDevicesAction({ currentPassword: password });
      if (result.ok) {
        setPassword("");
        notify.success(t("done"));
        return;
      }
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      setError(translate(fieldError ?? result.error) ?? null);
    });

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <p className="text-sm text-ink-500">{t("hint")}</p>
      <TextField value={password} onChange={setPassword} className="w-full">
        <Label>{t("currentPassword")}</Label>
        <Input type="password" autoComplete="current-password" />
      </TextField>
      {error ? <p role="alert" className="text-sm text-danger-600">{error}</p> : null}
      <div>
        <ActionButton tone="danger" pending={pending} disabled={!password} onClick={submit}>{t("submit")}</ActionButton>
      </div>
    </form>
  );
}
