"use client";

import { addToast, Button, Card, CardBody, CardHeader, Chip, Input, Snippet } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { saveSyncAppAction } from "../actions/sync-actions";
import type { SyncAppView } from "../types";

/** Calendar → Settings: OAuth apps of the active sync plugins (managers only). */
export function SyncAppsSettings({ apps }: { apps: SyncAppView[] }) {
  const t = useTranslations("calendar.sync");
  if (apps.length === 0) return <p className="text-small text-default-600">{t("noOAuthPlugins")}</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-default-600">{t("appsDescription")}</p>
      {apps.map((app) => <AppForm key={app.provider} app={app} />)}
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
    <Card shadow="sm">
      <CardHeader className="flex items-center gap-2">
        <span className="font-semibold">{t(`providers.${app.provider}` as never)}</span>
        <Chip size="sm" variant="flat" color={app.configured ? "success" : "warning"}>{t(app.configured ? "appConfigured" : "appNotConfigured")}</Chip>
      </CardHeader>
      <CardBody className="flex flex-col gap-3 pt-0">
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
      </CardBody>
    </Card>
  );
}
