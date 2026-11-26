"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import {
  getMyNotificationPreferencesAction,
  saveMyNotificationPreferencesAction,
  saveMyNotificationSettingsAction,
} from "../actions/preferences";
import type { NotificationSettingsInput, PreferenceView } from "../services/preferences";

const CHANNELS = ["email", "web_push", "telegram", "whatsapp", "sms"] as const;
const DEFAULT_SETTINGS: NotificationSettingsInput = {
  quietFrom: null, quietTo: null, digestMode: "instant", digestTime: "07:30",
};

/** User-scoped preferences, with every write confirmed by backend before UI success. */
export function NotificationPreferencesForm({ available }: { available?: Partial<Record<typeof CHANNELS[number], boolean>> | null }) {
  const t = useTranslations("notifications");
  // #586: Tür anahtarı (ör. "meetings.invited") yerine okunur ad; çevirisi olmayan yeni türlerde anahtar gösterilir.
  const typeLabel = (typeKey: string) => (t.has(`ui.typeLabels.${typeKey}`) ? t(`ui.typeLabels.${typeKey}`) : typeKey);
  const [types, setTypes] = useState<PreferenceView[]>([]);
  const [settings, setSettings] = useState<NotificationSettingsInput>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState(false);
  // #604: Yalnız çalışan kanallar sütun olarak gösterilir (yapılandırılmamış kanal hiçbir şey göndermez).
  const visibleChannels = available ? CHANNELS.filter((channel) => available[channel]) : CHANNELS;

  useEffect(() => {
    let active = true;
    void getMyNotificationPreferencesAction({}).then((result) => {
      if (!active) return;
      if (!result.ok) { setUnavailable(true); return; }
      setTypes(result.data.types);
      setSettings(result.data.settings);
      setUnavailable(false);
    }).catch(() => { if (active) setUnavailable(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function change(typeKey: string, channel: typeof CHANNELS[number], enabled: boolean) {
    if (pending) return;
    setPending(true);
    try {
      const result = await saveMyNotificationPreferencesAction({ changes: [{ typeKey, channel, enabled }] });
      if (!result.ok) { notify.error(t("ui.preferencesError")); return; }
      setTypes((current) => current.map((row) => row.typeKey === typeKey
        ? { ...row, channels: { ...row.channels, [channel]: enabled } } : row));
      notify.success(t("ui.preferencesSaved"));
    } catch {
      notify.error(t("ui.preferencesError"));
    } finally {
      setPending(false);
    }
  }

  async function saveSettings() {
    if (pending || (settings.quietFrom === null) !== (settings.quietTo === null) ||
      (settings.quietFrom !== null && settings.quietFrom === settings.quietTo)) return;
    setPending(true);
    try {
      const result = await saveMyNotificationSettingsAction(settings);
      if (!result.ok) { notify.error(t("ui.preferencesError")); return; }
      notify.success(t("ui.preferencesSaved"));
    } catch {
      notify.error(t("ui.preferencesError"));
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p role="status" className="text-sm text-ink-500">{t("ui.loading")}</p>;
  if (unavailable) return <p role="alert" className="text-sm text-danger">{t("ui.unavailable")}</p>;
  return (
    <div className="space-y-6">
      <section aria-label={t("ui.preferencesTitle")} className="space-y-3 rounded-xl border border-ink-200 p-4">
        <h2 className="font-semibold">{t("ui.preferencesTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <caption className="sr-only">{t("ui.preferencesTable")}</caption>
            <thead><tr className="border-b border-ink-200">
              <th scope="col" className="p-2">{t("ui.type")}</th>
              <th scope="col" className="p-2">{t("ui.inApp")}</th>
              {visibleChannels.map(channel => <th key={channel} scope="col" className="p-2">{t(`ui.channel.${channel}`)}</th>)}
            </tr></thead>
            <tbody>{types.map(row => <tr className="border-b border-ink-200/60" key={row.typeKey}>
              <th scope="row" className="p-2 font-medium">{typeLabel(row.typeKey)}</th>
              <td className="p-2"><input type="checkbox" checked disabled aria-label={t("ui.inApp")} /></td>
              {visibleChannels.map(channel => <td className="p-2" key={channel}>
                <input type="checkbox" checked={row.channels[channel] ?? false} disabled={pending}
                  aria-label={`${typeLabel(row.typeKey)} — ${t(`ui.channel.${channel}`)}`}
                  onChange={event => void change(row.typeKey, channel, event.target.checked)} />
              </td>)}
            </tr>)}</tbody>
          </table>
          {types.length === 0 && <p className="p-2 text-sm text-ink-500">{t("ui.emptyTypes")}</p>}
        </div>
      </section>
      <section aria-label={t("ui.settingsTitle")} className="space-y-4 rounded-xl border border-ink-200 p-4">
        <h2 className="font-semibold">{t("ui.settingsTitle")}</h2>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-sm font-medium">{t("ui.digestMode")}</legend>
          {(["instant", "daily"] as const).map(mode => <label key={mode} className="flex items-center gap-2 text-sm">
            <input type="radio" checked={settings.digestMode === mode} disabled={pending}
              onChange={() => setSettings(old => ({ ...old, digestMode: mode }))} />
            {t(`ui.digest.${mode}`)}
          </label>)}
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField isDisabled={pending}>
            <Label>{t("ui.quietFrom")}</Label>
            <Input type="time" value={settings.quietFrom ?? ""}
              onChange={event => setSettings(old => ({ ...old, quietFrom: event.target.value || null }))} />
          </TextField>
          <TextField isDisabled={pending}>
            <Label>{t("ui.quietTo")}</Label>
            <Input type="time" value={settings.quietTo ?? ""}
              onChange={event => setSettings(old => ({ ...old, quietTo: event.target.value || null }))} />
          </TextField>
          <TextField isDisabled={pending || settings.digestMode !== "daily"}>
            <Label>{t("ui.digestTime")}</Label>
            <Input type="time" value={settings.digestTime}
              onChange={event => setSettings(old => ({ ...old, digestTime: event.target.value }))} />
          </TextField>
        </div>
        <Button variant="primary" isPending={pending} isDisabled={pending ||
          (settings.quietFrom === null) !== (settings.quietTo === null) ||
          (settings.quietFrom !== null && settings.quietFrom === settings.quietTo)}
          onPress={() => void saveSettings()}>{t("ui.save")}</Button>
      </section>
    </div>
  );
}
