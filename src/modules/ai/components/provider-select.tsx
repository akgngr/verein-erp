"use client";

import { addToast, Button, Checkbox, Input } from "@heroui/react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/shared/utils";

import { saveAiProviderCredentialAction, setAiProviderAction } from "../actions/consent-actions";

type ProviderId = "local" | "mistral" | "anthropic" | "openai";
export type ProviderStatus = { id: ProviderId; hasKey: boolean; keyUnreadable: boolean; model: string | null; baseUrl: string | null; ready: boolean };

/** Tek sağlayıcının bağlantı formu. Kayıtlı anahtar asla gösterilmez; boş bırakılırsa korunur. */
function ProviderCard({ provider, active, canChange }: { provider: ProviderStatus; active: boolean; canChange: boolean }) {
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
    const result = await saveAiProviderCredentialAction({ provider: provider.id, apiKey, clearKey, model, baseUrl });
    setBusy(null);
    if (!result.ok) return void addToast({ title: result.error, color: "danger" });
    setApiKey("");
    setClearKey(false);
    addToast({ title: t("credentialSaved"), color: "success" });
    router.refresh();
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-medium border p-4", active ? "border-primary bg-primary-50/40 dark:bg-primary-500/10" : "border-default-200 bg-content1")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-small font-semibold">{tProvider(`${provider.id}.name`)}</span>
        {active ? (
          <span className="flex items-center gap-1 text-tiny font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("providerActive")}
          </span>
        ) : null}
      </div>
      <span className="text-small text-default-600">{tProvider(`${provider.id}.where`)}</span>
      <span className="text-tiny text-default-500">{provider.ready ? t("providerReady", { model: provider.model || tProvider(`${provider.id}.defaultModel`) }) : t("providerMissing")}</span>

      {canChange ? (
        <div className="flex flex-col gap-2">
          {isLocal ? (
            <Input size="sm" label={t("fields.baseUrl")} labelPlacement="outside" placeholder="http://ollama:11434/v1" description={t("fields.baseUrlHelp")} value={baseUrl} onValueChange={setBaseUrl} />
          ) : null}
          <Input
            size="sm"
            type="password"
            autoComplete="off"
            label={isLocal ? t("fields.apiKeyOptional") : t("fields.apiKey")}
            labelPlacement="outside"
            placeholder={provider.hasKey ? t("fields.apiKeyKept") : ""}
            startContent={<KeyRound className="h-3.5 w-3.5 text-default-400" aria-hidden />}
            description={provider.keyUnreadable ? t("fields.keyUnreadable") : provider.hasKey ? t("fields.keyStored") : undefined}
            value={apiKey}
            onValueChange={setApiKey}
            isDisabled={clearKey}
          />
          {provider.hasKey ? (
            <Checkbox size="sm" isSelected={clearKey} onValueChange={setClearKey}>
              {t("fields.clearKey")}
            </Checkbox>
          ) : null}
          <Input size="sm" label={t("fields.model")} labelPlacement="outside" placeholder={tProvider(`${provider.id}.defaultModel`)} value={model} onValueChange={setModel} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" color="primary" variant="flat" isLoading={busy === "save"} onPress={save}>
              {t("credentialSave")}
            </Button>
            {!active ? (
              <Button
                size="sm"
                color="primary"
                isDisabled={!provider.ready}
                isLoading={busy === "use"}
                onPress={async () => {
                  setBusy("use");
                  const result = await setAiProviderAction({ provider: provider.id });
                  setBusy(null);
                  if (!result.ok) return void addToast({ title: result.error, color: "danger" });
                  addToast({ title: t("providerChanged"), color: "success" });
                  router.refresh();
                }}
              >
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
export function ProviderSelect({ providers, active, canChange }: { providers: ProviderStatus[]; active: string | null; canChange: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} active={provider.id === active} canChange={canChange} />
      ))}
    </div>
  );
}
