"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import {
  listNotificationChannelsAction, requestTelegramLinkAction, revokeTelegramLinkAction,
  saveTelegramChannelAction, telegramLinkStatusAction,
} from "../actions/channels";

/** Telegram linking is opt-in; admin bot secret can only be written, never read back. */
export function NotificationChannelLinks({ showLink = true }: { showLink?: boolean } = {}) {
  const t = useTranslations("notifications");
  const [status, setStatus] = useState<"linked" | "pending" | "none" | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [adminEnabled, setAdminEnabled] = useState<boolean | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    void telegramLinkStatusAction({}).then((r) => { if (mounted && r.ok) setStatus(r.data.status); }).catch(() => {});
    void listNotificationChannelsAction({}).then((r) => {
      if (!mounted || !r.ok) return;
      const telegram = r.data.find(x => x.channel === "telegram");
      if (!telegram) return;
      setAdminEnabled(telegram.enabled);
      setHasToken(telegram.secretKeys.length > 0);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function link() {
    if (pending) return;
    setPending(true);
    try {
      const r = await requestTelegramLinkAction({});
      if (!r.ok || !/^https:\/\/t\.me\/[a-zA-Z0-9_?=&-]+$/.test(r.data.url)) {
        notify.error(t("ui.preferencesError")); return;
      }
      setUrl(r.data.url);
      setStatus("pending");
    } catch { notify.error(t("ui.preferencesError")); }
    finally { setPending(false); }
  }

  async function revoke() {
    if (pending) return;
    setPending(true);
    try {
      const r = await revokeTelegramLinkAction({});
      if (!r.ok) { notify.error(t("ui.preferencesError")); return; }
      setStatus("none"); setUrl(null);
      notify.success(t("ui.preferencesSaved"));
    } catch { notify.error(t("ui.preferencesError")); }
    finally { setPending(false); }
  }

  async function saveAdmin() {
    if (pending || adminEnabled === null) return;
    setPending(true);
    try {
      const r = await saveTelegramChannelAction({
        enabled: adminEnabled,
        ...(botToken.trim() ? { botToken: botToken.trim() } : {}),
      });
      if (!r.ok) { notify.error(t("ui.preferencesError")); return; }
      setHasToken(hasToken || Boolean(botToken.trim()));
      setBotToken("");
      notify.success(t("ui.preferencesSaved"));
    } catch { notify.error(t("ui.preferencesError")); }
    finally { setPending(false); }
  }

  return (
    <div className="space-y-4">
      {showLink ? (
      <section aria-label={t("ui.telegramLinkTitle")} className="space-y-3 rounded-xl border border-ink-200 p-4">
        <h2 className="font-semibold">{t("ui.telegramLinkTitle")}</h2>
        <p role="status" className="text-sm text-ink-500">
          {status ? t(`ui.link.${status}`) : t("ui.loading")}
        </p>
        {status === "linked" ? (
          <Button variant="danger-soft" isDisabled={pending} onPress={() => void revoke()}>{t("ui.telegramUnlink")}</Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" isDisabled={pending} onPress={() => void link()}>{t("ui.telegramConnect")}</Button>
            {url ? <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-accent underline-offset-4 hover:underline focus-visible:underline">
              {t("ui.telegramOpen")}
            </a> : null}
          </div>
        )}
      </section>
      ) : null}
      {adminEnabled !== null ? (
        <section aria-label={t("ui.telegramAdmin")} className="space-y-3 rounded-xl border border-ink-200 p-4">
          <h2 className="font-semibold">{t("ui.telegramAdmin")}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={pending} checked={adminEnabled}
              onChange={event => setAdminEnabled(event.target.checked)} />{t("ui.telegramEnabled")}
          </label>
          <TextField isDisabled={pending}>
            <Label>{t("ui.telegramToken")}</Label>
            <Input type="password" autoComplete="new-password" value={botToken}
              onChange={event => setBotToken(event.target.value)} />
          </TextField>
          <p className="text-xs text-ink-500">{hasToken ? t("ui.telegramTokenSaved") : t("ui.telegramTokenMissing")}</p>
          <Button variant="primary" isDisabled={pending} isPending={pending} onPress={() => void saveAdmin()}>
            {t("ui.save")}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
