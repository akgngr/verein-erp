"use client";
import {
  toast,
  Button,
  Spinner,
  Checkbox,
  Label,
  TextField,
  Input,
  Description,
  InputGroup,
} from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/shared/utils";

import {
  saveAiProviderCredentialAction,
  setAiProviderAction,
} from "../actions/consent-actions";

type ProviderId = "local" | "mistral" | "anthropic" | "openai";
export type ProviderStatus = {
  id: ProviderId;
  hasKey: boolean;
  keyUnreadable: boolean;
  model: string | null;
  baseUrl: string | null;
  ready: boolean;
};

/** Tek sağlayıcının bağlantı formu. Kayıtlı anahtar asla gösterilmez; boş bırakılırsa korunur. */
function ProviderCard({
  provider,
  active,
  canChange,
}: {
  provider: ProviderStatus;
  active: boolean;
  canChange: boolean;
}) {
  const t = useTranslations("ai.settings");
  const tProvider = useTranslations("ai.providers");
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [model, setModel] = useState(provider.model ?? "");
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? "");
  const [busy, setBusy] = useState<"save" | "use" | null>(null);
  const isLocal = provider.id === "local";

  const save = async () => {
    setBusy("save");
    const result = await saveAiProviderCredentialAction({
      provider: provider.id,
      apiKey,
      clearKey,
      model,
      baseUrl,
    });
    setBusy(null);
    if (!result.ok) return void toast(result.error, { variant: "danger" });
    setApiKey("");
    setClearKey(false);
    toast(t("credentialSaved"), { variant: "success" });
    router.refresh();
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4",
        active
          ? "border-accent bg-brand-50/40 dark:bg-brand-500/10"
          : "border-ink-200 bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {tProvider(`${provider.id}.name`)}
        </span>
        {active ? (
          <span className="flex items-center gap-1 text-xs font-medium text-accent">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("providerActive")}
          </span>
        ) : null}
      </div>
      <span className="text-sm text-ink-600">
        {tProvider(`${provider.id}.where`)}
      </span>
      <span className="text-xs text-ink-500">
        {provider.ready
          ? t("providerReady", {
              model: provider.model || tProvider(`${provider.id}.defaultModel`),
            })
          : t("providerMissing")}
      </span>

      {canChange ? (
        <div className="flex flex-col gap-2">
          {isLocal ? (
            <TextField
              value={baseUrl}
              onChange={setBaseUrl}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{t("fields.baseUrl")}</Label>
              <Input
                placeholder="http://ollama:11434/v1"
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
              <Description>{t("fields.baseUrlHelp")}</Description>
            </TextField>
          ) : null}
          <TextField
            value={apiKey}
            isDisabled={clearKey}
            onChange={setApiKey}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>
              {isLocal ? t("fields.apiKeyOptional") : t("fields.apiKey")}
            </Label>
            <InputGroup>
              <InputGroup.Prefix>
                {<KeyRound className="h-3.5 w-3.5 text-ink-400" aria-hidden />}
              </InputGroup.Prefix>
              <InputGroup.Input
                type="password"
                autoComplete="off"
                placeholder={provider.hasKey ? t("fields.apiKeyKept") : ""}
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </InputGroup>
            <Description>
              {provider.keyUnreadable
                ? t("fields.keyUnreadable")
                : provider.hasKey
                  ? t("fields.keyStored")
                  : undefined}
            </Description>
          </TextField>
          {provider.hasKey ? (
            <Checkbox isSelected={clearKey} onChange={setClearKey}>
              <Checkbox.Content>
                <Checkbox.Control className="size-4">
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Label>{t("fields.clearKey")}</Label>
              </Checkbox.Content>
            </Checkbox>
          ) : null}
          <TextField
            value={model}
            onChange={setModel}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.model")}</Label>
            <Input
              placeholder={tProvider(`${provider.id}.defaultModel`)}
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </TextField>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onPress={save}
              variant={actionVariant("primary", "flat")}
              isPending={busy === "save"}
            >
              {busy === "save" ? <Spinner size="sm" color="current" /> : null}
              {t("credentialSave")}
            </Button>
            {!active ? (
              <Button
                size="sm"
                isDisabled={!provider.ready}
                onPress={async () => {
                  setBusy("use");
                  const result = await setAiProviderAction({
                    provider: provider.id,
                  });
                  setBusy(null);
                  if (!result.ok)
                    return void toast(result.error, { variant: "danger" });
                  toast(t("providerChanged"), { variant: "success" });
                  router.refresh();
                }}
                variant={actionVariant("primary", "solid")}
                isPending={busy === "use"}
              >
                {busy === "use" ? <Spinner size="sm" color="current" /> : null}
                {t("providerUse")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Yönetici: izinli sağlayıcıların bağlantı bilgisini girer ve birini etkinleştirir. */
export function ProviderSelect({
  providers,
  active,
  canChange,
}: {
  providers: ProviderStatus[];
  active: string | null;
  canChange: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          active={provider.id === active}
          canChange={canChange}
        />
      ))}
    </div>
  );
}
