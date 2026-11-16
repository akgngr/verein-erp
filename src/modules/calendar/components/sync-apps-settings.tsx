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
} from "@heroui/react";
import { CopyValue } from "@/shared/components/ui/copy-value";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { saveSyncAppAction } from "../actions/sync-actions";
import type { SyncAppView } from "../types";

/** Calendar → Settings: OAuth apps of the active sync plugins (managers only). */
export function SyncAppsSettings({ apps }: { apps: SyncAppView[] }) {
  const t = useTranslations("calendar.sync");
  if (apps.length === 0)
    return <p className="text-sm text-ink-600">{t("noOAuthPlugins")}</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-600">{t("appsDescription")}</p>
      {apps.map((app) => (
        <AppForm key={app.provider} app={app} />
      ))}
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
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Header
        className={["flex items-center gap-2"].filter(Boolean).join(" ")}
      >
        <span className="font-semibold">
          {t(`providers.${app.provider}` as never)}
        </span>
        <Chip
          size="sm"
          color={statusTone(app.configured ? "success" : "warning")}
          variant={"soft"}
          style={statusStyle(app.configured ? "success" : "warning")}
        >
          {t(app.configured ? "appConfigured" : "appNotConfigured")}
        </Chip>
      </Card.Header>
      <Card.Content
        className={["flex flex-col gap-3 pt-0"].filter(Boolean).join(" ")}
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-500">{t("redirectUri")}</span>
          <CopyValue
            value={app.redirectUri}
            className={"max-w-full"}
            truncate
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <TextField
            value={clientId}
            onChange={setClientId}
            className={["max-w-xs"].filter(Boolean).join(" ")}
          >
            <Label>{t("clientId")}</Label>
            <Input
              autoComplete="off"
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </TextField>
          <TextField
            value={clientSecret}
            onChange={setClientSecret}
            className={["max-w-xs"].filter(Boolean).join(" ")}
          >
            <Label>{t("clientSecret")}</Label>
            <Input
              type="password"
              placeholder={app.configured ? t("secretKept") : undefined}
              autoComplete="new-password"
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </TextField>
          {app.provider === "outlook" ? (
            <TextField
              value={tenant}
              onChange={setTenant}
              className={["max-w-[12rem]"].filter(Boolean).join(" ")}
            >
              <Label>{t("tenant")}</Label>
              <Input
                placeholder="common"
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
          ) : null}
          <Button
            size="sm"
            isDisabled={
              clientId.trim().length < 5 || (!app.configured && !clientSecret)
            }
            onPress={() =>
              startTransition(async () => {
                const response = await saveSyncAppAction({
                  provider: app.provider,
                  clientId,
                  clientSecret,
                  tenant,
                });
                if (!response.ok)
                  return void toast(response.error, { variant: "danger" });
                setClientSecret("");
                toast(t("appSaved"), { variant: "success" });
                router.refresh();
              })
            }
            variant={actionVariant("primary", "flat")}
            isPending={pending}
          >
            {pending ? <Spinner size="sm" color="current" /> : null}
            {t("save")}
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
