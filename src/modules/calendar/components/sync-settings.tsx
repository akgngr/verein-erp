"use client";

import { addToast, Button, Chip, Input, Snippet, Switch } from "@heroui/react";
import { KeyRound, Link2, RefreshCw, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  connectPasswordAction,
  disconnectSyncAction,
  saveSyncAppAction,
  startOAuthAction,
  syncNowAction,
  toggleSyncCalendarAction,
} from "../actions/sync-actions";
import type { SyncAccountView, SyncAppView, SyncProviderView, SyncSettingsData } from "../types";

const STATUS_COLOR = { ACTIVE: "success", ERROR: "warning", REAUTH: "danger", PENDING: "default" } as const;

/** Connected external calendars (Google/Outlook/Apple plugins) and, for managers, OAuth app setup. */
export function SyncSettings({ data }: { data: SyncSettingsData }) {
  const t = useTranslations("calendar.sync");
  if (data.providers.length === 0) {
    return (
      <section className="flex flex-col gap-1">
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-small text-default-600">{t("noPlugins")}</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-small text-default-600">{t("description")}</p>
      </div>
      {data.providers.map((provider) => (
        <ProviderRow key={provider.key} provider={provider} account={data.accounts.find((account) => account.provider === provider.key) ?? null} />
      ))}
      {data.apps?.length ? (
        <div className="flex flex-col gap-3 border-t border-default-200 pt-3">
          <div>
            <h4 className="text-small font-semibold">{t("appsTitle")}</h4>
            <p className="text-tiny text-default-500">{t("appsDescription")}</p>
          </div>
          {data.apps.map((app) => <AppForm key={app.provider} app={app} />)}
        </div>
      ) : null}
    </section>
  );
}

function ProviderRow({ provider, account }: { provider: SyncProviderView; account: SyncAccountView | null }) {
  const t = useTranslations("calendar.sync");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const name = t(`providers.${provider.key}` as never);

  const run = (action: () => Promise<{ ok: boolean; error?: string } | void>) => startTransition(async () => {
    const response = await action();
    if (response && !response.ok) addToast({ title: response.error, color: "danger" });
    router.refresh();
  });

  const connect = () => {
    if (provider.auth === "password") return setShowForm(true);
    startTransition(async () => {
      const response = await startOAuthAction({ provider: provider.key });
      if (!response.ok) return void addToast({ title: response.error, color: "danger" });
      window.location.assign(response.data.url);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-medium border border-default-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        {account ? <Chip size="sm" variant="flat" color={STATUS_COLOR[account.status]}>{t(`status.${account.status}`)}</Chip> : null}
        {account?.accountLabel ? <span className="text-small text-default-500">{account.accountLabel}</span> : null}
        <div className="ms-auto flex flex-wrap gap-2">
          {account && account.status !== "REAUTH" ? (
            <Button size="sm" variant="flat" isLoading={pending} startContent={<RefreshCw className="h-4 w-4" />}
              onPress={() => run(async () => {
                const response = await syncNowAction({ accountId: account.id });
                if (response.ok) addToast({ title: t("synced", { count: response.data.events }), color: "success" });
                return response;
              })}>
              {t("syncNow")}
            </Button>
          ) : null}
          {!account || account.status === "REAUTH" ? (
            <Button size="sm" color="primary" variant="flat" isDisabled={!provider.appConfigured} isLoading={pending} startContent={<Link2 className="h-4 w-4" />} onPress={connect}>
              {account ? t("reconnect") : t("connect")}
            </Button>
          ) : null}
          {account ? (
            <Button size="sm" variant="light" color="danger" isLoading={pending} startContent={<Unlink className="h-4 w-4" />}
              onPress={() => run(() => disconnectSyncAction({ accountId: account.id }))}>
              {t("disconnect")}
            </Button>
          ) : null}
        </div>
      </div>
      {!provider.appConfigured ? <p className="text-tiny text-warning-700">{t("appMissingHint")}</p> : null}
      {account?.lastError ? <p className="text-tiny text-danger">{t(`codes.${account.lastError}` as never)}</p> : null}
      {account?.lastSyncAt ? <p className="text-tiny text-default-500">{t("lastSync", { date: format.dateTime(new Date(account.lastSyncAt), { dateStyle: "medium", timeStyle: "short" }) })}</p> : null}

      {showForm && provider.auth === "password" ? (
        <div className="flex flex-col gap-2">
          <p className="text-tiny text-default-500">{t("appPasswordHint")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <Input size="sm" className="max-w-xs" label={t("username")} value={username} onValueChange={setUsername} autoComplete="off" />
            <Input size="sm" className="max-w-xs" type="password" label={t("appPassword")} value={password} onValueChange={setPassword} autoComplete="new-password" />
            <Button size="sm" color="primary" isLoading={pending} isDisabled={!username || password.length < 4} startContent={<KeyRound className="h-4 w-4" />}
              onPress={() => run(async () => {
                const response = await connectPasswordAction({ provider: provider.key, username, password, serverUrl: provider.defaultServerUrl ?? "" });
                if (response.ok) {
                  setPassword("");
                  setShowForm(false);
                  addToast({ title: t("connected"), color: "success" });
                }
                return response;
              })}>
              {t("connect")}
            </Button>
          </div>
        </div>
      ) : null}

      {account?.calendars.length ? (
        <ul className="flex flex-col gap-1">
          {account.calendars.map((calendar) => (
            <li key={calendar.id} className="flex items-center gap-2 text-small">
              <Switch size="sm" isSelected={calendar.enabled} isDisabled={pending} aria-label={calendar.name}
                onValueChange={(enabled) => run(() => toggleSyncCalendarAction({ calendarId: calendar.id, enabled }))} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: calendar.color }} />
              {calendar.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AppForm({ app }: { app: SyncAppView }) {
  const t = useTranslations("calendar.sync");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(app.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [tenant, setTenant] = useState(app.tenant ?? "");

  return (
    <div className="flex flex-col gap-2">
      <span className="text-small font-medium">{t(`providers.${app.provider}` as never)}</span>
      <div className="flex flex-col gap-1">
        <span className="text-tiny text-default-500">{t("redirectUri")}</span>
        <Snippet symbol="" size="sm" className="max-w-full" classNames={{ pre: "truncate" }}>{app.redirectUri}</Snippet>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Input size="sm" className="max-w-xs" label={t("clientId")} value={clientId} onValueChange={setClientId} autoComplete="off" />
        <Input size="sm" className="max-w-xs" type="password" label={t("clientSecret")} placeholder={app.configured ? t("secretKept") : undefined}
          value={clientSecret} onValueChange={setClientSecret} autoComplete="new-password" />
        {app.provider === "outlook" ? <Input size="sm" className="max-w-[12rem]" label={t("tenant")} placeholder="common" value={tenant} onValueChange={setTenant} /> : null}
        <Button size="sm" color="primary" variant="flat" isLoading={pending} isDisabled={clientId.trim().length < 5 || (!app.configured && !clientSecret)}
          onPress={() => startTransition(async () => {
            const response = await saveSyncAppAction({ provider: app.provider, clientId, clientSecret, tenant });
            if (!response.ok) return void addToast({ title: response.error, color: "danger" });
            setClientSecret("");
            addToast({ title: t("appSaved"), color: "success" });
            router.refresh();
          })}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
