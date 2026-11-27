"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { listNotificationChannelsAction, saveSmsChannelAction, saveWhatsappChannelAction } from "../actions/channels";

type Config = { enabled: boolean; secretKeys: string[]; settings: Record<string, string> };

/**
 * #604 — admin settings for SMS and WhatsApp (Telegram has its own section). Secrets are write-only: an empty
 * field keeps the stored value; the server rejects enabling a channel that is not fully configured (WhatsApp also
 * needs the explicit "Meta approved the template" confirmation). Renders nothing for non-admins.
 */
export function ChannelAdminSettings() {
  const t = useTranslations("notifications.ui.channelAdmin");
  const translate = useTranslateMessage();
  const [configs, setConfigs] = useState<Record<string, Config> | null>(null);
  const [sms, setSms] = useState({ enabled: false, provider: "seven", apiKey: "", accountSid: "", sender: "" });
  const [wa, setWa] = useState({ enabled: false, accessToken: "", phoneNumberId: "", templateName: "", templateLanguage: "de", verifyTemplateName: "", templateApproved: false });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    void listNotificationChannelsAction({}).then((result) => {
      if (!mounted || !result.ok) return;
      const byChannel = Object.fromEntries(result.data.map((row) => [row.channel, row]));
      setConfigs(byChannel);
      const s = byChannel.sms;
      if (s) setSms((old) => ({ ...old, enabled: s.enabled, provider: s.settings.provider || "seven", accountSid: s.settings.accountSid ?? "", sender: s.settings.sender ?? "" }));
      const w = byChannel.whatsapp;
      if (w) setWa((old) => ({ ...old, enabled: w.enabled, phoneNumberId: w.settings.phoneNumberId ?? "", templateName: w.settings.templateName ?? "", templateLanguage: w.settings.templateLanguage || "de", verifyTemplateName: w.settings.verifyTemplateName ?? "", templateApproved: w.settings.templateApproved === "true" }));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!configs) return null;

  async function save(fn: () => Promise<{ ok: boolean; error?: string }>, clear: () => void) {
    if (pending) return;
    setPending(true);
    try {
      const result = await fn();
      if (!result.ok) { notify.error(translate(result.error) ?? t("error")); return; }
      clear();
      notify.success(t("saved"));
    } catch { notify.error(t("error")); }
    finally { setPending(false); }
  }

  const secretHint = (channel: string, key: string) => (configs[channel]?.secretKeys.includes(key) ? t("secretStored") : t("secretMissing"));
  const checkbox = "flex items-center gap-2 text-sm";

  return (
    <div className="space-y-4">
      <section aria-label={t("smsTitle")} className="space-y-3 rounded-xl border border-ink-200 p-4">
        <h2 className="font-semibold">{t("smsTitle")}</h2>
        <label className={checkbox}><input type="checkbox" disabled={pending} checked={sms.enabled} onChange={(e) => setSms({ ...sms, enabled: e.target.checked })} />{t("enabled")}</label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("provider")}</span>
          <select className="max-w-xs rounded-lg border border-ink-200 bg-surface px-3 py-2" disabled={pending} value={sms.provider} onChange={(e) => setSms({ ...sms, provider: e.target.value })}>
            <option value="seven">seven.io</option>
            <option value="twilio">Twilio</option> {/* i18n-ignore */}
          </select>
        </label>
        <TextField value={sms.apiKey} onChange={(apiKey) => setSms({ ...sms, apiKey })} isDisabled={pending} className="max-w-md">
          <Label>{t("apiKey")}</Label>
          <Input type="password" autoComplete="new-password" />
        </TextField>
        <p className="text-xs text-ink-500">{secretHint("sms", "apiKey")}</p>
        {sms.provider === "twilio" ? (
          <TextField value={sms.accountSid} onChange={(accountSid) => setSms({ ...sms, accountSid })} isDisabled={pending} className="max-w-md">
            <Label>{t("accountSid")}</Label>
            <Input />
          </TextField>
        ) : null}
        <TextField value={sms.sender} onChange={(sender) => setSms({ ...sms, sender })} isDisabled={pending} className="max-w-xs">
          <Label>{t("sender")}</Label>
          <Input maxLength={16} />
        </TextField>
        <Button variant="primary" isDisabled={pending} isPending={pending} onPress={() => void save(
          () => saveSmsChannelAction({ enabled: sms.enabled, provider: sms.provider as "seven" | "twilio", ...(sms.apiKey.trim() ? { apiKey: sms.apiKey.trim() } : {}), ...(sms.provider === "twilio" ? { accountSid: sms.accountSid.trim() } : {}), sender: sms.sender.trim() }),
          () => setSms((old) => ({ ...old, apiKey: "" })),
        )}>{t("save")}</Button>
      </section>

      <section aria-label={t("whatsappTitle")} className="space-y-3 rounded-xl border border-ink-200 p-4">
        <h2 className="font-semibold">{t("whatsappTitle")}</h2>
        <p className="text-sm text-ink-500">{t("whatsappHint")}</p>
        <label className={checkbox}><input type="checkbox" disabled={pending} checked={wa.enabled} onChange={(e) => setWa({ ...wa, enabled: e.target.checked })} />{t("enabled")}</label>
        <TextField value={wa.accessToken} onChange={(accessToken) => setWa({ ...wa, accessToken })} isDisabled={pending} className="max-w-md">
          <Label>{t("accessToken")}</Label>
          <Input type="password" autoComplete="new-password" />
        </TextField>
        <p className="text-xs text-ink-500">{secretHint("whatsapp", "accessToken")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField value={wa.phoneNumberId} onChange={(phoneNumberId) => setWa({ ...wa, phoneNumberId })} isDisabled={pending}>
            <Label>{t("phoneNumberId")}</Label>
            <Input inputMode="numeric" />
          </TextField>
          <TextField value={wa.templateLanguage} onChange={(templateLanguage) => setWa({ ...wa, templateLanguage })} isDisabled={pending}>
            <Label>{t("templateLanguage")}</Label>
            <Input maxLength={5} />
          </TextField>
          <TextField value={wa.templateName} onChange={(templateName) => setWa({ ...wa, templateName })} isDisabled={pending}>
            <Label>{t("templateName")}</Label>
            <Input />
          </TextField>
          <TextField value={wa.verifyTemplateName} onChange={(verifyTemplateName) => setWa({ ...wa, verifyTemplateName })} isDisabled={pending}>
            <Label>{t("verifyTemplateName")}</Label>
            <Input />
          </TextField>
        </div>
        <label className={checkbox}><input type="checkbox" disabled={pending} checked={wa.templateApproved} onChange={(e) => setWa({ ...wa, templateApproved: e.target.checked })} />{t("templateApproved")}</label>
        <Button variant="primary" isDisabled={pending} isPending={pending} onPress={() => void save(
          () => saveWhatsappChannelAction({
            enabled: wa.enabled,
            ...(wa.accessToken.trim() ? { accessToken: wa.accessToken.trim() } : {}),
            phoneNumberId: wa.phoneNumberId.trim(),
            templateName: wa.templateName.trim(),
            templateLanguage: wa.templateLanguage.trim(),
            verifyTemplateName: wa.verifyTemplateName.trim(),
            templateApproved: wa.templateApproved,
          }),
          () => setWa((old) => ({ ...old, accessToken: "" })),
        )}>{t("save")}</Button>
      </section>
    </div>
  );
}
