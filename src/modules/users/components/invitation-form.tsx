"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Input, Label, TextField } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { acceptInvitationAction } from "../actions/invitations";

export function InvitationForm({ token }: { token: string }) {
  const t = useTranslations("users.invite");
  const translate = useTranslateMessage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const result = await acceptInvitationAction({ token, password, confirm });
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
      <ActionButton tone="primary" pending={pending} disabled={!password || !confirm} onClick={submit}>{t("submit")}</ActionButton>
    </form>
  );
}
