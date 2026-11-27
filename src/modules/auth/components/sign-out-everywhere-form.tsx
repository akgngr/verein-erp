"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Input, Label, TextField } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { signOutOtherDevicesAction } from "../actions/sessions";

/** One-shot flag: the confirmation is shown after the full page load that applies the re-issued cookie. */
const DONE_FLAG = "auth.signOutOtherDevices.done";

/** #603: Ends every other session after re-entering the current password; this device stays signed in. */
export function SignOutEverywhereForm() {
  const t = useTranslations("auth.profile.sessions");
  const translate = useTranslateMessage();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DONE_FLAG)) {
        window.sessionStorage.removeItem(DONE_FLAG);
        notify.success(t("done"));
      }
    } catch {
      // Storage unavailable (private mode etc.): the sign-out itself is unaffected.
    }
  }, [t]);

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await signOutOtherDevicesAction({ currentPassword: password });
      if (result.ok) {
        setPassword("");
        // The action re-issued this device's cookie with the new session version, but Next re-renders the current
        // page inside the same action response with the *old* request cookie — which is now invalid and would bounce
        // to /giris?pasif=1. A full navigation sends the new cookie (same approach as the password change form).
        try {
          window.sessionStorage.setItem(DONE_FLAG, "1");
        } catch {
          notify.success(t("done"));
        }
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/profil");
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
