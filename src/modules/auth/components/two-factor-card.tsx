"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Input, Label, TextField } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";
import type { ActionResult } from "@/shared/types/action";

import {
  confirmTwoFactorEnrolmentAction, disableTwoFactorAction, regenerateRecoveryCodesAction, startTwoFactorEnrolmentAction,
  twoFactorStatusAction,
} from "../actions/two-factor";

type Status = { enabled: boolean; recoveryCodesLeft: number };
type Enrolment = { manualKey: string; otpauthUri: string };

function firstError(result: Extract<ActionResult<unknown>, { ok: false }>): string {
  return (result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined) ?? result.error;
}

/**
 * #603 — optional TOTP second factor on /profil: set up with an authenticator app (manual key or otpauth link),
 * confirm with a code, keep the one-time recovery codes; turn off or replace codes with a current code.
 */
export function TwoFactorCard() {
  const t = useTranslations("auth.twoFactor");
  const translate = useTranslateMessage();
  const [status, setStatus] = useState<Status | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = useCallback(async () => {
    const result = await twoFactorStatusAction({}).catch(() => null);
    if (result?.ok) setStatus(result.data);
  }, []);
  useEffect(() => {
    let mounted = true;
    void twoFactorStatusAction({}).then((result) => { if (mounted && result.ok) setStatus(result.data); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const run = <T,>(fn: () => Promise<ActionResult<T>>, onSuccess: (data: T) => void | Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        const result = await fn();
        if (!result.ok) { setError(translate(firstError(result)) ?? t("error")); return; }
        setPassword("");
        setCode("");
        await onSuccess(result.data);
      } catch {
        setError(t("error"));
      }
    });

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText((recoveryCodes ?? []).join("\n"));
      notify.success(t("recovery.copied"));
    } catch {
      notify.error(t("error"));
    }
  };

  const errorLine = error ? <p role="alert" className="text-sm text-danger-600">{error}</p> : null;
  const codeField = (
    <TextField value={code} onChange={setCode} isDisabled={pending} className="sm:max-w-[14rem]">
      <Label>{t("code")}</Label>
      <Input inputMode="text" autoComplete="one-time-code" maxLength={32} />
    </TextField>
  );

  if (recoveryCodes) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{t("recovery.title")}</p>
        <p className="text-sm text-ink-500">{t("recovery.hint")}</p>
        <ul aria-label={t("recovery.title")} className="grid grid-cols-2 gap-2 rounded-lg border border-ink-200 p-3 font-mono text-sm">
          {recoveryCodes.map((value) => <li key={value}>{value}</li>)}
        </ul>
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="neutral" onClick={() => void copyCodes()}>{t("recovery.copy")}</ActionButton>
          <ActionButton tone="primary" onClick={() => { setRecoveryCodes(null); void refresh(); }}>{t("recovery.done")}</ActionButton>
        </div>
      </div>
    );
  }

  if (status === null) return <p role="status" className="text-sm text-ink-500">{t("loading")}</p>;

  if (enrolment) {
    return (
      <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); run(() => confirmTwoFactorEnrolmentAction({ code }), (data) => { setEnrolment(null); setRecoveryCodes(data.recoveryCodes); notify.success(t("enabled")); }); }}>
        <p className="text-sm text-ink-500">{t("setup.step1")}</p>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-500">{t("setup.manualKey")}</span>
          <code className="select-all rounded-lg border border-ink-200 px-3 py-2 font-mono text-sm tracking-wider">{enrolment.manualKey}</code>
          <a href={enrolment.otpauthUri} className="self-start text-sm font-medium text-accent hover:underline">{t("setup.openApp")}</a>
        </div>
        <p className="text-sm text-ink-500">{t("setup.step2")}</p>
        {codeField}
        {errorLine}
        <div className="flex flex-wrap gap-2">
          <ActionButton tone="primary" pending={pending} disabled={!/^\d{3}\s?\d{3}$/.test(code.trim())} onClick={() => run(() => confirmTwoFactorEnrolmentAction({ code }), (data) => { setEnrolment(null); setRecoveryCodes(data.recoveryCodes); notify.success(t("enabled")); })}>{t("setup.confirm")}</ActionButton>
          <ActionButton tone="neutral" disabled={pending} onClick={() => { setEnrolment(null); setCode(""); setError(null); }}>{t("cancel")}</ActionButton>
        </div>
      </form>
    );
  }

  if (!status.enabled) {
    return (
      <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); run(() => startTwoFactorEnrolmentAction({ currentPassword: password }), (data) => setEnrolment(data)); }}>
        <p role="status" className="text-sm text-ink-500">{t("off")}</p>
        <p className="text-sm text-ink-500">{t("hint")}</p>
        <TextField value={password} onChange={setPassword} isDisabled={pending} className="w-full">
          <Label>{t("currentPassword")}</Label>
          <Input type="password" autoComplete="current-password" />
        </TextField>
        {errorLine}
        <div>
          <ActionButton tone="primary" pending={pending} disabled={!password} onClick={() => run(() => startTwoFactorEnrolmentAction({ currentPassword: password }), (data) => setEnrolment(data))}>{t("setup.start")}</ActionButton>
        </div>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
      <p role="status" className="text-sm font-medium text-success-700 dark:text-success-300">{t("on", { count: status.recoveryCodesLeft })}</p>
      <p className="text-sm text-ink-500">{t("manageHint")}</p>
      {codeField}
      <TextField value={password} onChange={setPassword} isDisabled={pending} className="w-full">
        <Label>{t("currentPasswordForDisable")}</Label>
        <Input type="password" autoComplete="current-password" />
      </TextField>
      {errorLine}
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="neutral" pending={pending} disabled={!code.trim()} onClick={() => run(() => regenerateRecoveryCodesAction({ code }), (data) => setRecoveryCodes(data.recoveryCodes))}>{t("recovery.replace")}</ActionButton>
        <ActionButton tone="danger" pending={pending} disabled={!code.trim() || !password} onClick={() => run(() => disableTwoFactorAction({ currentPassword: password, code }), async () => { notify.success(t("disabled")); await refresh(); })}>{t("disable")}</ActionButton>
      </div>
    </form>
  );
}
