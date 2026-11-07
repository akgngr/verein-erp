"use client";

import { addToast, Button, Card, CardBody, CardHeader, Chip, Input, Select, SelectItem, Snippet } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";

import { saveChannelSettingsAction } from "../actions/mailing-actions";

export type ChannelSettingsView = {
  key: string;
  configured: boolean;
  webhooks: { key: string; url: string }[];
  settings: { key: string; secret: boolean; options: string[] | null; value: string; stored: boolean }[];
};

/** Kanal eklentilerinin sağlayıcı ayarları; gizli değerler yalnız yazılır, geri gösterilmez. */
export function ChannelSettings({ channels }: { channels: ChannelSettingsView[] }) {
  const t = useTranslations("mailings");
  if (!channels.length) return <p className="text-small text-default-600">{t("settings.noChannels")}</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {channels.map((channel) => <ChannelCard key={channel.key} channel={channel} />)}
    </div>
  );
}

function ChannelCard({ channel }: { channel: ChannelSettingsView }) {
  const t = useTranslations("mailings");
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(channel.settings.map((setting) => [setting.key, setting.value])));
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <Card shadow="sm">
      <CardHeader className="flex items-center gap-2">
        <span className="font-semibold">{t(`channels.${channel.key}.label` as never)}</span>
        <Chip size="sm" variant="flat" color={channel.configured ? "success" : "warning"}>{t(channel.configured ? "settings.configured" : "settings.notConfigured")}</Chip>
      </CardHeader>
      <CardBody className="flex flex-col gap-3 pt-0">
        <p className="text-small text-default-500">{t(`channels.${channel.key}.description` as never)}</p>
        {channel.settings.map((setting) => {
          const label = t(`channelSettings.${channel.key}.${setting.key}` as never);
          if (setting.options && hydrated) {
            return (
              <Select key={setting.key} size="sm" label={label} selectedKeys={values[setting.key] ? [values[setting.key]] : []}
                onSelectionChange={(keys) => set(setting.key, String(Array.from(keys)[0] ?? ""))}>
                {setting.options.map((option) => <SelectItem key={option}>{t(`channelOptions.${channel.key}.${setting.key}.${option}` as never)}</SelectItem>)}
              </Select>
            );
          }
          return (
            <Input key={setting.key} size="sm" label={label} type={setting.secret ? "password" : "text"} autoComplete="off"
              placeholder={setting.secret && setting.stored ? t("settings.secretKept") : undefined}
              value={values[setting.key] ?? ""} onValueChange={(value) => set(setting.key, value)} />
          );
        })}
        {channel.webhooks.map((webhook) => (
          <div key={webhook.key} className="flex flex-col gap-1">
            <span className="text-tiny text-default-500">{t(`settings.webhooks.${webhook.key}` as never)}</span>
            <Snippet symbol="" size="sm" className="max-w-full" classNames={{ pre: "truncate" }}>{webhook.url}</Snippet>
          </div>
        ))}
        <Button size="sm" color="primary" className="self-start" isLoading={pending}
          onPress={() => startTransition(async () => {
            const response = await saveChannelSettingsAction({ channel: channel.key, values });
            if (!response.ok) return void addToast({ title: response.error, color: "danger" });
            addToast({ title: t("settings.saved"), color: "success" });
            router.refresh();
          })}>
          {t("settings.save")}
        </Button>
      </CardBody>
    </Card>
  );
}
