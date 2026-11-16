"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Card,
  Chip,
  Button,
  Spinner,
  TextField,
  Label,
  Input,
  Select,
  ListBox,
} from "@heroui/react";
import { CopyValue } from "@/shared/components/ui/copy-value";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";

import { saveChannelSettingsAction } from "../actions/mailing-actions";

export type ChannelSettingsView = {
  key: string;
  configured: boolean;
  webhooks: { key: string; url: string }[];
  settings: {
    key: string;
    secret: boolean;
    options: string[] | null;
    value: string;
    stored: boolean;
  }[];
};

/** Kanal eklentilerinin sağlayıcı ayarları; gizli değerler yalnız yazılır, geri gösterilmez. */
export function ChannelSettings({
  channels,
}: {
  channels: ChannelSettingsView[];
}) {
  const t = useTranslations("mailings");
  if (!channels.length)
    return <p className="text-sm text-ink-600">{t("settings.noChannels")}</p>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {channels.map((channel) => (
        <ChannelCard key={channel.key} channel={channel} />
      ))}
    </div>
  );
}

function ChannelCard({ channel }: { channel: ChannelSettingsView }) {
  const t = useTranslations("mailings");
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      channel.settings.map((setting) => [setting.key, setting.value]),
    ),
  );
  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Header
        className={["flex items-center gap-2"].filter(Boolean).join(" ")}
      >
        <span className="font-semibold">
          {t(`channels.${channel.key}.label` as never)}
        </span>
        <Chip
          size="sm"
          color={statusTone(channel.configured ? "success" : "warning")}
          variant={"soft"}
          style={statusStyle(channel.configured ? "success" : "warning")}
        >
          {t(
            channel.configured
              ? "settings.configured"
              : "settings.notConfigured",
          )}
        </Chip>
      </Card.Header>
      <Card.Content
        className={["flex flex-col gap-3 pt-0"].filter(Boolean).join(" ")}
      >
        <p className="text-sm text-ink-500">
          {t(`channels.${channel.key}.description` as never)}
        </p>
        {channel.settings.map((setting) => {
          const label = t(
            `channelSettings.${channel.key}.${setting.key}` as never,
          );
          if (setting.options && hydrated) {
            return (
              <Select
                key={setting.key}
                value={values[setting.key] ? values[setting.key] : null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return set(setting.key, String(keys ?? ""));
                }}
              >
                <Label>{label}</Label>
                <Select.Trigger className="h-9 text-sm">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {setting.options.map((option) => (
                      <ListBox.Item
                        key={option}
                        id={option}
                        textValue={String(
                          t(
                            `channelOptions.${channel.key}.${setting.key}.${option}` as never,
                          ),
                        )}
                      >
                        <Label>
                          {t(
                            `channelOptions.${channel.key}.${setting.key}.${option}` as never,
                          )}
                        </Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            );
          }
          return (
            <TextField
              key={setting.key}
              value={values[setting.key] ?? ""}
              onChange={(value) => set(setting.key, value)}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{label}</Label>
              <Input
                type={setting.secret ? "password" : "text"}
                autoComplete="off"
                placeholder={
                  setting.secret && setting.stored
                    ? t("settings.secretKept")
                    : undefined
                }
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
          );
        })}
        {channel.webhooks.map((webhook) => (
          <div key={webhook.key} className="flex flex-col gap-1">
            <span className="text-xs text-ink-500">
              {t(`settings.webhooks.${webhook.key}` as never)}
            </span>
            <CopyValue value={webhook.url} className={"max-w-full"} truncate />
          </div>
        ))}
        <Button
          size="sm"
          className="self-start"
          onPress={() =>
            startTransition(async () => {
              const response = await saveChannelSettingsAction({
                channel: channel.key,
                values,
              });
              if (!response.ok)
                return void toast(response.error, { variant: "danger" });
              toast(t("settings.saved"), { variant: "success" });
              router.refresh();
            })
          }
          variant={actionVariant("primary", "solid")}
          isPending={pending}
        >
          {pending ? <Spinner size="sm" color="current" /> : null}
          {t("settings.save")}
        </Button>
      </Card.Content>
    </Card>
  );
}
