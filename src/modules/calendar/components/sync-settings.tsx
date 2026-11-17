"use client";

import { notify } from "@/shared/components/ui/notify";import { Button, buttonVariants, Link as ActionLink } from "@heroui/react";
import { Input, Label, Spinner, StatusChip, Switch, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { KeyRound, Link2, RefreshCw, Settings2, Unlink } from "lucide-react";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  connectPasswordAction,
  disconnectSyncAction,
  startOAuthAction,
  syncNowAction,
  toggleSyncCalendarAction,
} from "../actions/sync-actions";
import type {
  SyncAccountView,
  SyncProviderView,
  SyncSettingsData,
} from "../types";

const STATUS_COLOR = {
  ACTIVE: "success",
  ERROR: "warning",
  REAUTH: "danger",
  PENDING: "default",
} as const;

/** Connected external calendars (Google/Outlook/Apple plugins) and, for managers, OAuth app setup. */
export function SyncSettings({ data }: { data: SyncSettingsData }) {
  const t = useTranslations("calendar.sync");
  if (data.providers.length === 0) {
    return (
      <section className="flex flex-col gap-1">
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-sm text-ink-600">{t("noPlugins")}</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-sm text-ink-600">{t("description")}</p>
      </div>
      {data.providers.map((provider) => (
        <ProviderRow
          key={provider.key}
          provider={provider}
          canManage={data.canManage}
          account={
            data.accounts.find(
              (account) => account.provider === provider.key,
            ) ?? null
          }
        />
      ))}
    </section>
  );
}

function ProviderRow({
  provider,
  account,
  canManage,
}: {
  provider: SyncProviderView;
  account: SyncAccountView | null;
  canManage: boolean;
}) {
  const t = useTranslations("calendar.sync");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const name = t(`providers.${provider.key}` as never);

  const run = (action: () => Promise<{ ok: boolean; error?: string } | void>) =>
    startTransition(async () => {
      const response = await action();
      if (response && !response.ok)
        notify.error(response.error);
      router.refresh();
    });

  const connect = () => {
    if (provider.auth === "password") return setShowForm(true);
    startTransition(async () => {
      const response = await startOAuthAction({ provider: provider.key });
      if (!response.ok)
        return void notify.error(response.error);
      window.location.assign(response.data.url);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-ink-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        {account ? (
          <StatusChip tone={STATUS_COLOR[account.status]}
          >
            {t(`status.${account.status}`)}
          </StatusChip>
        ) : null}
        {account?.accountLabel ? (
          <span className="text-sm text-ink-500">{account.accountLabel}</span>
        ) : null}
        <div className="ms-auto flex flex-wrap gap-2">
          {account && account.status !== "REAUTH" ? (
            <Button
              size="sm"
              onPress={() =>
                run(async () => {
                  const response = await syncNowAction({
                    accountId: account.id,
                  });
                  if (response.ok)
                    notify.success(t("synced", { count: response.data.events }));
                  return response;
                })
              }
              variant={actionVariant("default", "flat")}
              isPending={pending}
            >
              {pending ? <Spinner size="sm" tone="current" /> : null}
              {<RefreshCw className="h-4 w-4" />}
              {t("syncNow")}
            </Button>
          ) : null}
          {!account || account.status === "REAUTH" ? (
            <Button
              size="sm"
              isDisabled={!provider.appConfigured}
              onPress={connect}
              variant={actionVariant("primary", "flat")}
              isPending={pending}
            >
              {pending ? <Spinner size="sm" tone="current" /> : null}
              {<Link2 className="h-4 w-4" />}
              {account ? t("reconnect") : t("connect")}
            </Button>
          ) : null}
          {account ? (
            <Button
              size="sm"
              onPress={() =>
                run(() => disconnectSyncAction({ accountId: account.id }))
              }
              variant={actionVariant("danger", "light")}
              isPending={pending}
            >
              {pending ? <Spinner size="sm" tone="current" /> : null}
              {<Unlink className="h-4 w-4" />}
              {t("disconnect")}
            </Button>
          ) : null}
        </div>
      </div>
      {!provider.appConfigured ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-warning-700">
            {t(canManage ? "appMissingAdmin" : "appMissingHint")}
          </p>
          {canManage ? (
            <ActionLink
              href="/calendar/ayarlar"
              className={buttonVariants({
                variant: actionVariant("warning", "flat"),
                size: "sm",
              })}
            >
              {<Settings2 className="h-4 w-4" />}
              {t("openSettings")}
            </ActionLink>
          ) : null}
        </div>
      ) : null}
      {account?.lastError ? (
        <p className="text-xs text-danger">
          {t(`codes.${account.lastError}` as never)}
        </p>
      ) : null}
      {account?.lastSyncAt ? (
        <p className="text-xs text-ink-500">
          {t("lastSync", {
            date: format.dateTime(new Date(account.lastSyncAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      ) : null}

      {showForm && provider.auth === "password" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-500">{t("appPasswordHint")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <TextField
              value={username}
              onChange={setUsername}
              className={["max-w-xs"].filter(Boolean).join(" ")}
            >
              <Label>{t("username")}</Label>
              <Input
                autoComplete="off"
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
            <TextField
              value={password}
              onChange={setPassword}
              className={["max-w-xs"].filter(Boolean).join(" ")}
            >
              <Label>{t("appPassword")}</Label>
              <Input
                type="password"
                autoComplete="new-password"
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
            <Button
              size="sm"
              isDisabled={!username || password.length < 4}
              onPress={() =>
                run(async () => {
                  const response = await connectPasswordAction({
                    provider: provider.key,
                    username,
                    password,
                    serverUrl: provider.defaultServerUrl ?? "",
                  });
                  if (response.ok) {
                    setPassword("");
                    setShowForm(false);
                    notify.success(t("connected"));
                  }
                  return response;
                })
              }
              variant={actionVariant("primary", "solid")}
              isPending={pending}
            >
              {pending ? <Spinner size="sm" tone="current" /> : null}
              {<KeyRound className="h-4 w-4" />}
              {t("connect")}
            </Button>
          </div>
        </div>
      ) : null}

      {account?.calendars.length ? (
        <ul className="flex flex-col gap-1">
          {account.calendars.map((calendar) => (
            <li key={calendar.id} className="flex items-center gap-2 text-sm">
              <Switch
                isSelected={calendar.enabled}
                isDisabled={pending}
                aria-label={calendar.name}
                onChange={(enabled) =>
                  run(() =>
                    toggleSyncCalendarAction({
                      calendarId: calendar.id,
                      enabled,
                    }),
                  )
                }
                size={"sm"}
              >
                  <Label></Label>
              </Switch>
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: calendar.color }}
              />
              {calendar.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
