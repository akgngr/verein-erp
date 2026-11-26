"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import {
  confirmSmsVerificationAction, confirmWhatsappVerificationAction, phoneLinkStatusAction, requestSmsVerificationAction,
  requestWhatsappVerificationAction, revokeSmsAction, revokeWhatsappAction,
} from "../actions/channels";

const ACTIONS = {
  sms: { request: requestSmsVerificationAction, confirm: confirmSmsVerificationAction, revoke: revokeSmsAction },
  whatsapp: { request: requestWhatsappVerificationAction, confirm: confirmWhatsappVerificationAction, revoke: revokeWhatsappAction },
} as const;

type Status = { status: "linked" | "pending" | "none"; masked: string | null };

/** #604: Users verify their own SMS/WhatsApp number with a 6-digit code; only the last digits are ever shown. */
export function PhoneChannelLink({ channel }: { channel: "sms" | "whatsapp" }) {
  const t = useTranslations("notifications.ui.phoneLink");
  const translate = useTranslateMessage();
  const [state, setState] = useState<Status | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    const result = await phoneLinkStatusAction({ channel }).catch(() => null);
    if (result?.ok) setState(result.data);
  }, [channel]);
  useEffect(() => {
    let mounted = true;
    void phoneLinkStatusAction({ channel }).then((result) => { if (mounted && result.ok) setState(result.data); }).catch(() => {});
    return () => { mounted = false; };
  }, [channel]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    if (pending) return;
    setPending(true);
    try {
      const result = await fn();
      if (!result.ok) { notify.error(translate(result.error) ?? t("error")); return; }
      notify.success(success);
      setCode("");
      await refresh();
    } catch { notify.error(t("error")); }
    finally { setPending(false); }
  }

  const title = t(`title.${channel}`);
  return (
    <section aria-label={title} className="space-y-3 rounded-xl border border-ink-200 p-4">
      <h2 className="font-semibold">{title}</h2>
      <p role="status" className="text-sm text-ink-500">
        {state === null ? t("loading") : state.status === "linked" ? t("linked", { number: state.masked ?? "" }) : state.status === "pending" ? t("pending", { number: state.masked ?? "" }) : t("none")}
      </p>
      {state?.status === "linked" ? (
        <Button variant="danger-soft" isDisabled={pending} onPress={() => void run(() => ACTIONS[channel].revoke({}), t("revoked"))}>{t("revoke")}</Button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField value={phone} onChange={setPhone} isDisabled={pending} className="sm:max-w-xs">
            <Label>{t("phone")}</Label>
            <Input type="tel" autoComplete="tel" placeholder="+49 151 …" />
          </TextField>
          <Button variant="secondary" isDisabled={pending || phone.trim().length < 6} onPress={() => void run(() => ACTIONS[channel].request({ phone }), t("codeSent"))}>
            {t("sendCode")}
          </Button>
        </div>
      )}
      {state?.status === "pending" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField value={code} onChange={setCode} isDisabled={pending} className="sm:max-w-[10rem]">
            <Label>{t("code")}</Label>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
          </TextField>
          <Button variant="primary" isDisabled={pending || !/^\d{6}$/.test(code)} onPress={() => void run(() => ACTIONS[channel].confirm({ code }), t("confirmed"))}>
            {t("confirm")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
